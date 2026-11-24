import json
import logging
import os
import shutil
import uuid
from datetime import timedelta
from pathlib import Path

from django.apps import apps
from django.core.management import call_command
from django.core.management.base import CommandError
from django.utils import timezone
from django.utils.dateparse import parse_datetime
import pytest

from .factories import LibraryFactory, LibraryUserFactory, PhotoTagFactory, TagFactory, TaskFactory, UserFactory
from photonix.accounts.models import User
from photonix.photos.management.commands.housekeeping import Command as HousekeepingCommand
from photonix.photos.models import (
    Library, LibraryInvitation, LibraryPath, LibraryUser, Photo, PhotoFile, PhotoTag, Tag, Task)
from photonix.photos.utils import demo
from photonix.photos.utils.db import record_photo
from photonix.photos.utils.thumbnails import THUMBNAILER_VERSION, generate_thumbnails_for_photo


TEST_FIXTURE = Path(__file__).parent / 'fixtures' / 'demo_library.json'
SNOW = Path(__file__).parent / 'photos' / 'snow.jpg'
FIXTURE_PHOTOS_DIR = '/data/photos/'

REFUSAL = ('reset_demo refused: DEMO is not enabled on this instance. '
           'This command deletes every user, library and photo record.')


def _fixture_rows(path=TEST_FIXTURE):
    with open(path) as f:
        return json.load(f)


def _fixture_keys(path=TEST_FIXTURE):
    return {(row['model'], row['pk']) for row in _fixture_rows(path)}


def _db_keys(labels):
    keys = set()
    for label in labels:
        model = apps.get_model(label)
        keys |= {(label, str(pk)) for pk in model.objects.values_list('pk', flat=True)}
    return keys


@pytest.fixture
def demo_on(monkeypatch):
    monkeypatch.setattr('photonix.web.utils.demo_mode_enabled', lambda: True)


@pytest.fixture
def demo_off(monkeypatch):
    monkeypatch.setattr('photonix.web.utils.demo_mode_enabled', lambda: False)


class FakeResponse:
    def __init__(self, status_code=200, body=b''):
        self.status_code = status_code
        self.body = body

    def __enter__(self):
        return self

    def __exit__(self, *exc):
        return False

    def raise_for_status(self):
        if self.status_code >= 400:
            raise demo.requests.HTTPError(f'{self.status_code} Error')

    def iter_content(self, chunk_size=1):
        for i in range(0, len(self.body), chunk_size):
            yield self.body[i:i + chunk_size]


def _fake_get(monkeypatch, response):
    calls = []

    def fake_get(url, **kwargs):
        calls.append((url, kwargs))
        return response

    monkeypatch.setattr(demo.requests, 'get', fake_get)
    return calls


class FetchLog(list):
    """URLs fetched, with the full (url, kwargs) of each call in .calls."""
    def __init__(self):
        super().__init__()
        self.calls = []


@pytest.fixture
def no_network(monkeypatch):
    """requests.get in demo.py returns snow.jpg instead of touching the network."""
    log = FetchLog()

    def fake_get(url, **kwargs):
        log.append(url)
        log.calls.append((url, kwargs))
        return FakeResponse(200, SNOW.read_bytes())

    monkeypatch.setattr(demo.requests, 'get', fake_get)
    return log


@pytest.fixture
def fixture_on_disk(tmp_path, monkeypatch, no_network):
    """The test fixture rewritten to point at real copies of snow.jpg in tmp_path.

    Demo photos are downloaded to tmp_path (never /data/photos) and the
    fixture's /data/photos/ paths are rewritten to match.
    """
    photos_dir = tmp_path / 'photos'
    photos_dir.mkdir()
    monkeypatch.setattr(demo, 'determine_destination', lambda fn: str(photos_dir))
    text = TEST_FIXTURE.read_text().replace(FIXTURE_PHOTOS_DIR, f'{photos_dir}/')
    fixture = tmp_path / 'demo_library.json'
    fixture.write_text(text)
    monkeypatch.setattr(demo, 'FIXTURE_PATH', fixture)
    for row in _fixture_rows(fixture):
        if row['model'] == 'photos.photofile':
            shutil.copy(SNOW, row['fields']['path'])
    return fixture


@pytest.fixture
def test_fixture(monkeypatch):
    monkeypatch.setattr(demo, 'FIXTURE_PATH', TEST_FIXTURE)
    return TEST_FIXTURE


def _make_unrelated_data():
    user = UserFactory(username='someone')
    library = LibraryFactory(name='Real Library')
    LibraryUserFactory(library=library, user=user)
    tag = TagFactory(library=library, name='Holiday')
    PhotoTagFactory(tag=tag, photo__library=library, confidence=1.0)
    TaskFactory(library=library, status='P', subject_id=uuid.uuid4())
    LibraryInvitation.objects.create(
        library=library, created_by=user, expires_at=timezone.now() + timedelta(days=1))
    return user, library


def test_refusal_text_is_exact():
    assert demo.RESET_REFUSAL == REFUSAL


def test_refusal_when_demo_off_leaves_rows_untouched(db, demo_off, test_fixture):
    _make_unrelated_data()
    before = {m: m.objects.count() for m in (User, Library, LibraryUser, Tag, PhotoTag, Photo, Task, LibraryInvitation)}

    with pytest.raises(CommandError) as excinfo:
        call_command('reset_demo')
    assert str(excinfo.value) == REFUSAL

    with pytest.raises(CommandError) as excinfo:
        demo.reset_demo()
    assert str(excinfo.value) == REFUSAL

    assert {m: m.objects.count() for m in before} == before


def test_reset_replaces_everything_with_fixture_rows(db, demo_on, test_fixture):
    user, library = _make_unrelated_data()

    counts = demo.reset_demo()

    assert not User.objects.filter(pk=user.pk).exists()
    assert not Library.objects.filter(pk=library.pk).exists()
    assert not Tag.objects.filter(name='Holiday').exists()
    assert not LibraryInvitation.objects.exists()

    labels = {row['model'] for row in _fixture_rows()}
    assert _db_keys(labels) == _fixture_keys()
    # Nothing in the photos app beyond the fixture, apart from the guard tasks
    fixture_models = {apps.get_model(label) for label in labels}
    for model in apps.get_app_config('photos').get_models():
        if model not in fixture_models and model is not Task:
            assert model.objects.count() == 0, model

    assert counts['photos.Photo'] == 2
    assert counts['photos.Task'] == 2
    assert counts['accounts.User'] == 1


def test_reset_keeps_fixture_timestamps(db, demo_on, test_fixture):
    demo.reset_demo()
    for row in _fixture_rows():
        if row['model'].startswith('photos.') and 'created_at' in row['fields']:
            obj = apps.get_model(row['model']).objects.get(pk=row['pk'])
            assert obj.created_at == parse_datetime(row['fields']['created_at'])
            assert obj.updated_at == parse_datetime(row['fields']['updated_at'])


def test_reset_restores_face_embedding(db, demo_on, test_fixture):
    demo.reset_demo()
    face = PhotoTag.objects.get(tag__type='F')
    assert len(json.loads(face.extra_data)['facenet_embedding']) == 128


def test_reset_creates_one_completed_classify_images_task_per_photo(db, demo_on, test_fixture):
    demo.reset_demo()
    photo_ids = set(Photo.objects.values_list('id', flat=True))
    tasks = list(Task.objects.all())
    assert len(tasks) == len(photo_ids) == 2
    assert {t.subject_id for t in tasks} == photo_ids
    assert all(t.type == 'classify_images' and t.status == 'C' for t in tasks)


def test_reset_sets_thumbnailed_version(db, demo_on, test_fixture):
    demo.reset_demo()
    assert set(Photo.objects.values_list('thumbnailed_version', flat=True)) == {THUMBNAILER_VERSION}
    assert set(PhotoFile.objects.values_list('thumbnailed_version', flat=True)) == {THUMBNAILER_VERSION}


def test_reset_makes_dev_user_owner(db, demo_on, test_fixture, monkeypatch):
    demo.reset_demo()
    assert not LibraryUser.objects.get().owner
    monkeypatch.setenv('ENV', 'dev')
    demo.reset_demo(allow_dev=True)
    assert LibraryUser.objects.get().owner


def test_reset_command_prints_counts(db, demo_on, test_fixture, capsys):
    call_command('reset_demo')
    out = capsys.readouterr().out
    assert 'photos.Photo: 2' in out
    assert 'photos.Task: 2' in out


def test_reset_without_fixture_fails(db, demo_on, monkeypatch, tmp_path):
    UserFactory(username='keep')
    monkeypatch.setattr(demo, 'FIXTURE_PATH', tmp_path / 'missing.json')
    with pytest.raises(CommandError):
        demo.reset_demo()
    assert User.objects.filter(username='keep').exists()


def test_two_resets_give_identical_rows(db, demo_on, test_fixture):
    first = demo.reset_demo()
    keys = _db_keys({row['model'] for row in _fixture_rows()})
    second = demo.reset_demo()
    first.pop('deleted')
    second.pop('deleted')
    assert first == second
    assert _db_keys({row['model'] for row in _fixture_rows()}) == keys


def test_thumbnailing_restored_photo_queues_no_analysis(db, demo_on, fixture_on_disk):
    demo.reset_demo()
    photo = Photo.objects.first()
    task = Task.objects.create(type='generate_thumbnails', subject_id=photo.id, library=photo.library)

    generate_thumbnails_for_photo(photo.id, task)

    task.refresh_from_db()
    assert task.status == 'C'
    assert Task.objects.filter(type='classify_images').count() == 2
    assert not Task.objects.filter(type='classify_images').exclude(status='C').exists()
    assert not Task.objects.filter(type__startswith='classify.').exists()


def test_housekeeping_after_reset_queues_no_thumbnails(db, demo_on, fixture_on_disk):
    demo.reset_demo()
    HousekeepingCommand().housekeeping()
    assert not Task.objects.filter(type='generate_thumbnails').exists()
    assert Photo.objects.count() == 2  # Files exist, so orphan cleanup removed nothing


def test_download_pins_mtimes_so_rescan_skips(db, demo_on, fixture_on_disk, no_network):
    demo.reset_demo()
    present = demo.download_demo_photos(pin_mtimes=True)

    # Every URL is present; only those not already on disk were "downloaded"
    assert len(present) == len(demo.DEMO_PHOTO_URLS)
    assert len(no_network) == len(demo.DEMO_PHOTO_URLS) - 2

    for photo_file in PhotoFile.objects.all():
        assert record_photo(photo_file.path, photo_file.photo.library) == 'SKIPPED'
    assert not Task.objects.exclude(type='classify_images').exists()


def test_download_failure_is_skipped(db, fixture_on_disk, monkeypatch):
    def failing_get(url, **kwargs):
        raise demo.requests.ConnectionError('network down')

    monkeypatch.setattr(demo.requests, 'get', failing_get)
    present = demo.download_demo_photos()
    assert len(present) == 2  # Only the two files already on disk


@pytest.fixture
def photos_dir(tmp_path, monkeypatch):
    path = tmp_path / 'photos'
    path.mkdir()
    monkeypatch.setattr(demo, 'determine_destination', lambda fn: str(path))
    return path


@pytest.mark.parametrize('response', [
    FakeResponse(404, b'<html>Not found</html>'),
    FakeResponse(200, b'<html><body>Rate limited</body></html>'),
], ids=['404', 'html-200'])
def test_bad_download_leaves_no_file(photos_dir, monkeypatch, caplog, response):
    _fake_get(monkeypatch, response)
    with caplog.at_level(logging.WARNING):
        present = demo.download_demo_photos()
    assert present == []
    assert list(photos_dir.iterdir()) == []  # No destination file and no temp file left
    assert demo.DEMO_PHOTO_URLS[0] in caplog.text


def test_download_passes_timeout(photos_dir, no_network):
    demo.download_demo_photos()
    assert len(no_network.calls) == len(demo.DEMO_PHOTO_URLS)
    for url, kwargs in no_network.calls:
        assert kwargs['timeout'] == (10, 60)
        assert kwargs['stream'] is True


def test_existing_invalid_file_is_redownloaded(photos_dir, no_network):
    bad = Path(demo.demo_photo_path(demo.DEMO_PHOTO_URLS[0]))
    bad.write_bytes(b'<html>truncated</html>')
    good = Path(demo.demo_photo_path(demo.DEMO_PHOTO_URLS[1]))
    shutil.copy(SNOW, good)

    present = demo.download_demo_photos()

    assert str(bad) in present
    assert demo.is_valid_image(bad)
    assert demo.DEMO_PHOTO_URLS[0] in no_network
    assert demo.DEMO_PHOTO_URLS[1] not in no_network  # A valid file is kept
    assert len(no_network) == len(demo.DEMO_PHOTO_URLS) - 1


def test_download_without_pin_keeps_mtimes(db, fixture_on_disk, no_network):
    """The dev path (classifiers on) must not rewrite demo file mtimes."""
    paths = [row['fields']['path'] for row in _fixture_rows(fixture_on_disk) if row['model'] == 'photos.photofile']
    os.utime(paths[0], (1_000_000, 1_000_000))
    before = {p: os.stat(p).st_mtime_ns for p in paths}

    demo.download_demo_photos()

    assert {p: os.stat(p).st_mtime_ns for p in paths} == before


def test_import_demo_photos_dev_path_does_not_pin_mtimes(db, demo_on, fixture_on_disk, monkeypatch, no_network):
    monkeypatch.delenv('CLASSIFICATION_DISABLED', raising=False)
    paths = [row['fields']['path'] for row in _fixture_rows(fixture_on_disk) if row['model'] == 'photos.photofile']
    os.utime(paths[0], (1_000_000, 1_000_000))
    before = {p: os.stat(p).st_mtime_ns for p in paths}

    call_command('import_demo_photos')

    assert {p: os.stat(p).st_mtime_ns for p in paths} == before


def test_reset_failure_after_deletes_rolls_back(db, demo_on, test_fixture, monkeypatch):
    user, library = _make_unrelated_data()
    task_ids = set(Task.objects.values_list('id', flat=True))
    assert task_ids

    def failing_load(*args, **kwargs):
        # Rows are already deleted by the time the fixture loads
        assert not User.objects.exists()
        raise RuntimeError('loaddata failed')

    monkeypatch.setattr(demo, 'call_command', failing_load)
    with pytest.raises(RuntimeError):
        demo.reset_demo()

    assert User.objects.filter(pk=user.pk).exists()
    assert Library.objects.filter(pk=library.pk).exists()
    assert set(Task.objects.values_list('id', flat=True)) == task_ids
    assert LibraryInvitation.objects.exists()


def test_import_demo_photos_survives_reset_failure(db, demo_on, fixture_on_disk, monkeypatch, caplog):
    monkeypatch.setenv('CLASSIFICATION_DISABLED', '1')

    def failing_reset(*args, **kwargs):
        raise CommandError('Demo fixture not found')

    monkeypatch.setattr('photonix.photos.management.commands.import_demo_photos.reset_demo', failing_reset)
    with caplog.at_level(logging.ERROR):
        call_command('import_demo_photos')  # Returns normally

    errors = [r for r in caplog.records if r.levelno == logging.ERROR]
    assert errors and 'Demo fixture not found' in caplog.text


def test_reset_refused_under_env_dev(db, demo_on, test_fixture, monkeypatch):
    monkeypatch.setenv('ENV', 'dev')
    keep = UserFactory(username='keep')
    dev_refusal = 'reset_demo refused: ENV=dev. Pass --allow-dev to reset a development database.'

    with pytest.raises(CommandError) as excinfo:
        call_command('reset_demo')
    assert str(excinfo.value) == dev_refusal

    with pytest.raises(CommandError) as excinfo:
        demo.reset_demo()
    assert str(excinfo.value) == dev_refusal

    assert User.objects.filter(pk=keep.pk).exists()


def test_reset_allow_dev_under_env_dev(db, demo_on, test_fixture, monkeypatch, capsys):
    monkeypatch.setenv('ENV', 'dev')
    keep = UserFactory(username='keep')

    call_command('reset_demo', '--allow-dev')

    assert 'Demo reset complete' in capsys.readouterr().out
    assert not User.objects.filter(pk=keep.pk).exists()
    assert LibraryUser.objects.get().owner  # Dev owner fixup applies


def test_reset_demo_off_refusal_wins_over_dev(db, demo_off, test_fixture, monkeypatch):
    monkeypatch.setenv('ENV', 'dev')
    with pytest.raises(CommandError) as excinfo:
        call_command('reset_demo', '--allow-dev')
    assert str(excinfo.value) == REFUSAL


def test_import_demo_photos_under_env_dev_records_instead_of_resetting(db, demo_on, photos_dir, monkeypatch, no_network):
    monkeypatch.setenv('ENV', 'dev')
    monkeypatch.setenv('CLASSIFICATION_DISABLED', '1')
    keep = UserFactory(username='keep')

    call_command('import_demo_photos')

    assert User.objects.filter(pk=keep.pk).exists()
    assert PhotoFile.objects.count() == len(demo.DEMO_PHOTO_URLS)
    assert LibraryUser.objects.get(user__username='demo').owner


def test_export_then_reset_round_trips(db, demo_on, tmp_path, monkeypatch, no_network):
    photos_dir = tmp_path / 'photos'
    photos_dir.mkdir()
    monkeypatch.setattr(demo, 'determine_destination', lambda fn: str(photos_dir))

    user = UserFactory(username='demo')
    library = LibraryFactory(name='Demo Library')
    LibraryUserFactory(library=library, user=user, owner=False)
    LibraryPath.objects.create(library=library, type='St', backend_type='Lo', path=f'{photos_dir}/')
    paths = demo.download_demo_photos()[:2]
    photos = [record_photo(path, library) for path in paths]
    tag = TagFactory(library=library, name='Snow', type='S', source='C')
    PhotoTagFactory(photo=photos[0], tag=tag, confidence=0.9)
    # A photo outside the demo list is not exported
    other = shutil.copy(SNOW, photos_dir / 'not_a_demo_photo.jpg')
    record_photo(str(other), library)

    fixture = tmp_path / 'exported.json'
    with pytest.raises(CommandError, match='not Completed'):
        demo.export_demo_fixture(fixture)
    assert not fixture.exists()

    Task.objects.update(status='C')
    counts = demo.export_demo_fixture(fixture)
    assert counts['photos.Photo'] == 2
    assert counts['photos.PhotoFile'] == 2
    assert counts['photos.PhotoTag'] == 1
    assert counts['photos.Tag'] == 1
    assert counts['accounts.User'] == 1
    exported_models = {row['model'] for row in _fixture_rows(fixture)}
    assert not exported_models & {'photos.task', 'photos.libraryinvitation', 'refresh_token.refreshtoken'}

    photo_ids = {p.id for p in photos}
    file_times = {f.path: f.file_modified_at for f in PhotoFile.objects.filter(photo_id__in=photo_ids)}

    monkeypatch.setattr(demo, 'FIXTURE_PATH', fixture)
    demo.reset_demo()

    assert set(Photo.objects.values_list('id', flat=True)) == photo_ids
    assert User.objects.get().username == 'demo'
    assert PhotoTag.objects.get().tag.name == 'Snow'
    assert _db_keys(exported_models) == _fixture_keys(fixture)

    # Rescan after the next pod start's download stays a no-op
    demo.download_demo_photos(pin_mtimes=True)
    for path in file_times:
        assert record_photo(path, library.id) == 'SKIPPED'


def test_export_command_writes_fixture(db, tmp_path, capsys):
    user = UserFactory(username='demo')
    library = LibraryFactory(name='Demo Library')
    LibraryUserFactory(library=library, user=user)
    out_path = tmp_path / 'out.json'
    call_command('export_demo_fixture', path=str(out_path))
    assert out_path.exists()
    assert str(out_path) in capsys.readouterr().out


def test_import_demo_photos_loads_stored_outputs_when_classification_disabled(db, demo_on, fixture_on_disk, monkeypatch):
    monkeypatch.setenv('CLASSIFICATION_DISABLED', '1')
    call_command('import_demo_photos')
    assert Photo.objects.count() == 2
    assert set(Task.objects.values_list('type', 'status')) == {('classify_images', 'C')}


def test_import_demo_photos_records_photos_otherwise(db, demo_on, tmp_path, monkeypatch, no_network):
    monkeypatch.delenv('CLASSIFICATION_DISABLED', raising=False)
    photos_dir = tmp_path / 'photos'
    photos_dir.mkdir()
    monkeypatch.setattr(demo, 'determine_destination', lambda fn: str(photos_dir))
    # One file already on disk: as before, it is not recorded again
    existing = photos_dir / demo.demo_photo_basenames()[0]
    shutil.copy(SNOW, existing)

    call_command('import_demo_photos')

    assert User.objects.get().username == 'demo'
    assert Library.objects.get().name == 'Demo Library'
    assert PhotoFile.objects.count() == len(demo.DEMO_PHOTO_URLS) - 1
    assert not PhotoFile.objects.filter(path=str(existing)).exists()
    assert Task.objects.filter(type='ensure_raw_processed', status='P').count() == len(demo.DEMO_PHOTO_URLS) - 1


def test_import_demo_photos_never_resets_without_demo_mode(db, demo_off, tmp_path, monkeypatch, no_network):
    monkeypatch.setenv('CLASSIFICATION_DISABLED', '1')
    photos_dir = tmp_path / 'photos'
    photos_dir.mkdir()
    monkeypatch.setattr(demo, 'determine_destination', lambda fn: str(photos_dir))
    keep = UserFactory(username='keep')

    call_command('import_demo_photos')

    assert User.objects.filter(pk=keep.pk).exists()
    assert PhotoFile.objects.count() == len(demo.DEMO_PHOTO_URLS)


def test_import_demo_photos_survives_malformed_fixture(db, demo_on, photos_dir, tmp_path, monkeypatch, caplog, no_network):
    monkeypatch.setenv('CLASSIFICATION_DISABLED', '1')
    bad = tmp_path / 'bad.json'
    bad.write_text('{not json')
    monkeypatch.setattr(demo, 'FIXTURE_PATH', bad)
    keep = UserFactory(username='keep')

    with caplog.at_level(logging.ERROR):
        call_command('import_demo_photos')  # Returns normally

    assert any(r.levelno == logging.ERROR for r in caplog.records)
    assert User.objects.filter(pk=keep.pk).exists()


def test_download_removes_stale_temp_files(photos_dir, no_network):
    stale = photos_dir / '.download-abc123.tmp'
    stale.write_bytes(b'\xff\xd8partial jpeg')
    unrelated = photos_dir / 'keep.txt'
    unrelated.write_text('x')

    demo.download_demo_photos()

    assert not stale.exists()
    assert unrelated.exists()
    assert not list(photos_dir.glob('.download-*'))
