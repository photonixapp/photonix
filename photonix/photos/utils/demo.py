"""Demo instance data: the photo list, the stored-outputs fixture and the reset.

The public demo runs without classifier processes. Instead of analysing its
photos it loads stored analysis results from a Django JSON fixture shipped in
the image, and `reset_demo` puts the database back to that fixture every 15
minutes (called by the infra CronJob).
"""
from datetime import timezone as dt_timezone
import json
import os
from pathlib import Path
import tempfile

from django.apps import apps
from django.contrib.admin.models import LogEntry
from django.contrib.auth import get_user_model
from django.core import serializers
from django.core.management import call_command
from django.core.management.base import CommandError
from django.db import connection, transaction
from django.utils import timezone
from django.utils.dateparse import parse_datetime
from graphql_jwt.refresh_token.utils import get_refresh_token_model
from PIL import Image
import requests

from photonix.photos.models import (
    Camera, Lens, Library, LibraryPath, LibraryUser, Photo, PhotoFile, PhotoTag, Tag, Task)
from photonix.photos.utils.fs import determine_destination
from photonix.photos.utils.thumbnails import THUMBNAILER_VERSION
from photonix.web import utils as web_utils
from photonix.web.utils import DEMO_USERNAME, logger


FIXTURE_PATH = Path(__file__).resolve().parent.parent / 'demo' / 'demo_library.json'
DEMO_LIBRARY_NAME = 'Demo Library'
DEMO_PHOTO_URLS = [
    'https://live.staticflickr.com/767/32439917684_25438930aa_o_d.jpg',
    'https://live.staticflickr.com/3706/33154545171_ed2a4af283_o_d.jpg',
    'https://live.staticflickr.com/3849/32440369924_b9e670290a_o_d.jpg',
    'https://live.staticflickr.com/2892/33127783192_0f73b4aa12_o_d.jpg',
    'https://live.staticflickr.com/657/32440441724_338aa20dae_o_d.jpg',
    'https://live.staticflickr.com/744/33155094101_766415ab15_o_d.jpg',
    'https://live.staticflickr.com/3750/33242383206_7bf8ba68f2_o_d.jpg',
    'https://live.staticflickr.com/572/32440255904_7ea0605d9e_o_d.jpg',
    'https://live.staticflickr.com/3771/32468418193_f8ea8caa32_o_d.jpg',
    'https://live.staticflickr.com/736/33127591042_2b31fe5d58_o_d.jpg',
    # Four face photos, see photonix/photos/demo/README.md for sources and licences
    'https://live.staticflickr.com/67/171086203_386e77b8b7_k.jpg',
    'https://live.staticflickr.com/4823/45907472935_1a631bc909_o_d.jpg',
    'https://live.staticflickr.com/4839/40008583563_0844026bc8_o_d.jpg',
    'https://live.staticflickr.com/900/41308431822_a4e12585cf_o_d.jpg',
]
RESET_ADVISORY_LOCK_ID = 515515
DOWNLOAD_TIMEOUT = (10, 60)  # (connect, read) seconds

# Stable match token for tests and the infra job log - do not reword
RESET_REFUSAL = (
    'reset_demo refused: DEMO is not enabled on this instance. '
    'This command deletes every user, library and photo record.'
)
RESET_DEV_REFUSAL = 'reset_demo refused: ENV=dev. Pass --allow-dev to reset a development database.'


def is_dev_environment():
    return os.environ.get('ENV') == 'dev'


def demo_photo_basenames():
    return [url.split('/')[-1] for url in DEMO_PHOTO_URLS]


def demo_photo_path(url):
    fn = url.split('/')[-1]
    return str(Path(determine_destination(fn)) / fn)


def _fixture_file_modified_times(path=None):
    """Map of PhotoFile path -> file_modified_at as stored in the fixture."""
    path = Path(path or FIXTURE_PATH)
    if not path.exists():
        return {}
    with open(path) as f:
        rows = json.load(f)
    times = {}
    for row in rows:
        if row.get('model') == 'photos.photofile':
            fields = row.get('fields', {})
            modified = parse_datetime(fields.get('file_modified_at') or '')
            if fields.get('path') and modified:
                if modified.tzinfo is None:
                    modified = modified.replace(tzinfo=dt_timezone.utc)
                times[fields['path']] = modified
    return times


def _pin_mtime(path, modified):
    # Integer nanoseconds so that reading st_mtime back gives exactly the
    # stored datetime (record_photo compares with microsecond precision)
    seconds = int(modified.replace(microsecond=0).timestamp())
    ns = seconds * 1_000_000_000 + modified.microsecond * 1000
    os.utime(path, ns=(ns, ns))


def is_valid_image(path):
    """True if the file at path exists and PIL can parse it as an image."""
    try:
        with Image.open(path) as image:
            image.verify()
        return True
    except Exception:
        return False


def _download_photo(url, dest_path):
    """Fetch url to dest_path via a temp file in the same directory, replacing it only once
    the response is a 2xx and the body is a valid image. Returns True on success; on any
    failure logs a warning naming the URL, removes the temp file and returns False."""
    temp_path = None
    try:
        dest_dir = os.path.dirname(dest_path)
        os.makedirs(dest_dir, exist_ok=True)
        logger.info(f'Fetching {url} -> {dest_path}')
        fd, temp_path = tempfile.mkstemp(dir=dest_dir, prefix=TEMP_PREFIX, suffix=TEMP_SUFFIX)
        with os.fdopen(fd, 'wb') as f:
            with requests.get(url, stream=True, timeout=DOWNLOAD_TIMEOUT) as response:
                response.raise_for_status()
                for chunk in response.iter_content(chunk_size=32768):
                    if chunk:
                        f.write(chunk)
        if not is_valid_image(temp_path):
            raise ValueError('response is not a valid image')
        os.replace(temp_path, dest_path)
        temp_path = None
        return True
    except Exception as e:
        logger.warning(f'Failed to download demo photo {url}: {e}')
        return False
    finally:
        if temp_path and os.path.exists(temp_path):
            os.remove(temp_path)


TEMP_PREFIX = '.download-'
TEMP_SUFFIX = '.tmp'


def _remove_stale_temp_files():
    """Remove partial downloads left by a hard-killed earlier run, so the hourly rescan
    never records a truncated file as a photo."""
    for dest_dir in {os.path.dirname(demo_photo_path(url)) for url in DEMO_PHOTO_URLS}:
        if not os.path.isdir(dest_dir):
            continue
        for name in os.listdir(dest_dir):
            if name.startswith(TEMP_PREFIX) and name.endswith(TEMP_SUFFIX):
                try:
                    os.remove(os.path.join(dest_dir, name))
                except OSError as e:
                    logger.warning(f'Could not remove stale download {name}: {e}')


def download_demo_photos(pin_mtimes=False):
    """Download each URL missing from disk (an existing file that is not a valid image counts
    as missing). A failed download is logged and skipped. With pin_mtimes, set each file's
    mtime (os.utime) to the file_modified_at its PhotoFile has in the fixture, when the
    fixture has that path; only the stored-outputs startup path passes it, so a dev install
    analysing its own photos keeps real mtimes. Returns the paths present on disk."""
    pinned_times = _fixture_file_modified_times() if pin_mtimes else {}
    _remove_stale_temp_files()
    present = []
    for url in DEMO_PHOTO_URLS:
        dest_path = demo_photo_path(url)
        if not is_valid_image(dest_path):
            if not _download_photo(url, dest_path):
                continue
        if dest_path in pinned_times:
            _pin_mtime(dest_path, pinned_times[dest_path])
        present.append(dest_path)
    return present


def export_demo_fixture(path=FIXTURE_PATH):
    """Serialize the Demo Library to Django JSON: the demo User, Library, LibraryPath,
    LibraryUser, and the Camera, Lens, Photo, PhotoFile, Tag and PhotoTag rows of photos whose
    file basename is in DEMO_PHOTO_URLS. No Task, token or invitation rows. Raises
    CommandError if any of those photos has a task that is not Completed. Returns row counts."""
    User = get_user_model()
    try:
        user = User.objects.get(username=DEMO_USERNAME)
    except User.DoesNotExist:
        raise CommandError(f'No user named "{DEMO_USERNAME}" to export')
    try:
        library = Library.objects.get(name=DEMO_LIBRARY_NAME)
    except Library.DoesNotExist:
        raise CommandError(f'No library named "{DEMO_LIBRARY_NAME}" to export')

    basenames = set(demo_photo_basenames())
    photo_ids = {
        photo_id for photo_id, file_path in
        PhotoFile.objects.filter(photo__library=library).values_list('photo_id', 'path')
        if os.path.basename(file_path) in basenames
    }
    photos = Photo.objects.filter(id__in=photo_ids).order_by('id')
    photo_files = PhotoFile.objects.filter(photo_id__in=photo_ids).order_by('id')

    subject_ids = set(photo_ids) | set(photo_files.values_list('id', flat=True))
    unfinished = Task.objects.filter(subject_id__in=subject_ids).exclude(status='C')
    if unfinished.exists():
        summary = ', '.join(sorted({f'{t.type} ({t.status})' for t in unfinished}))
        raise CommandError(
            f'{unfinished.count()} task(s) for demo photos are not Completed yet: {summary}. '
            'Wait for analysis to finish before exporting.')

    photo_tags = PhotoTag.objects.filter(photo_id__in=photo_ids).order_by('id')
    tag_ids = set(photo_tags.values_list('tag_id', flat=True))
    # Include parent tags so the fixture is self-contained
    pending = set(Tag.objects.filter(id__in=tag_ids, parent__isnull=False).values_list('parent_id', flat=True)) - tag_ids
    while pending:
        tag_ids |= pending
        pending = set(Tag.objects.filter(id__in=pending, parent__isnull=False).values_list('parent_id', flat=True)) - tag_ids

    groups = [
        ('accounts.User', User.objects.filter(pk=user.pk)),
        ('photos.Library', Library.objects.filter(pk=library.pk)),
        ('photos.LibraryPath', LibraryPath.objects.filter(library=library).order_by('id')),
        ('photos.LibraryUser', LibraryUser.objects.filter(library=library, user=user).order_by('id')),
        ('photos.Camera', Camera.objects.filter(photos__in=photo_ids).distinct().order_by('id')),
        ('photos.Lens', Lens.objects.filter(photos__in=photo_ids).distinct().order_by('id')),
        ('photos.Photo', photos),
        ('photos.PhotoFile', photo_files),
        ('photos.Tag', Tag.objects.filter(id__in=tag_ids).order_by('id')),
        ('photos.PhotoTag', photo_tags),
    ]
    objects = []
    counts = {}
    for label, queryset in groups:
        rows = list(queryset)
        counts[label] = len(rows)
        objects.extend(rows)

    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, 'w') as f:
        serializers.serialize('json', objects, indent=2, stream=f)
        f.write('\n')
    return counts


def _delete_all_records():
    deleted = 0
    for model in apps.get_app_config('photos').get_models():
        deleted += model.objects.all().delete()[0]
    for model in (get_refresh_token_model(), LogEntry, get_user_model()):
        deleted += model.objects.all().delete()[0]
    return deleted


def reset_demo(allow_dev=False):
    """Refuses unless demo mode is on, and under ENV=dev unless allow_dev.
    In one transaction: take pg_advisory_xact_lock(RESET_ADVISORY_LOCK_ID) on PostgreSQL,
    delete every row of every model in the `photos` app, every RefreshToken, admin LogEntry
    and User, load FIXTURE_PATH, set Photo.thumbnailed_version and PhotoFile.thumbnailed_version
    to THUMBNAILER_VERSION, and create one Completed `classify_images` Task per photo.
    Returns row counts."""
    # Checked here as well as in the command so no caller can wipe a real install
    if not web_utils.demo_mode_enabled():
        raise CommandError(RESET_REFUSAL)
    # The dev compose stack sets DEMO=1 against the shared dev database
    if is_dev_environment() and not allow_dev:
        raise CommandError(RESET_DEV_REFUSAL)

    fixture_path = Path(FIXTURE_PATH)
    if not fixture_path.exists():
        raise CommandError(f'Demo fixture not found: {fixture_path}')

    with transaction.atomic():
        if connection.vendor == 'postgresql':
            with connection.cursor() as cursor:
                cursor.execute('SELECT pg_advisory_xact_lock(%s)', [RESET_ADVISORY_LOCK_ID])

        deleted = _delete_all_records()

        # loaddata saves raw, keeping the fixture's created_at/updated_at
        call_command('loaddata', str(fixture_path), verbosity=0)

        # update() bypasses VersionedModel.save() so updated_at is untouched.
        # With these set, startup housekeeping queues no thumbnail regeneration.
        Photo.objects.update(thumbnailed_version=THUMBNAILER_VERSION)
        PhotoFile.objects.update(thumbnailed_version=THUMBNAILER_VERSION)

        # A Completed classify_images row stops generate_thumbnails_for_photo
        # chaining into analysis (utils/thumbnails.py)
        now = timezone.now()
        Task.objects.bulk_create([
            Task(
                type='classify_images', subject_id=photo_id, library_id=library_id,
                status='C', started_at=now, finished_at=now, created_at=now, updated_at=now)
            for photo_id, library_id in Photo.objects.values_list('id', 'library_id')
        ])

        # In the dev environment the demo user needs to own the library to
        # reach all functionality (as import_demo_photos has always done)
        if is_dev_environment():
            LibraryUser.objects.filter(
                library__name=DEMO_LIBRARY_NAME, user__username=DEMO_USERNAME).update(owner=True)

    counts = {'deleted': deleted}
    for label, model in [
        ('accounts.User', get_user_model()),
        ('photos.Library', Library),
        ('photos.LibraryPath', LibraryPath),
        ('photos.LibraryUser', LibraryUser),
        ('photos.Camera', Camera),
        ('photos.Lens', Lens),
        ('photos.Photo', Photo),
        ('photos.PhotoFile', PhotoFile),
        ('photos.Tag', Tag),
        ('photos.PhotoTag', PhotoTag),
        ('photos.Task', Task),
    ]:
        counts[label] = model.objects.count()
    return counts
