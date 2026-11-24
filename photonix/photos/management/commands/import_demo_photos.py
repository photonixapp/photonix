import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.utils import IntegrityError

from photonix.photos.models import Library, LibraryPath, LibraryUser
from photonix.photos.utils.db import record_photo
from photonix.photos.utils.demo import (
    DEMO_LIBRARY_NAME, DEMO_PHOTO_URLS, demo_photo_path, download_demo_photos, is_dev_environment,
    is_valid_image, reset_demo)
from photonix.web import utils as web_utils
from photonix.web.utils import logger


User = get_user_model()


class Command(BaseCommand):
    help = 'Downloads sample photos for displaying on the demo site'

    def import_photos(self, new_paths):
        # Create demo User account
        try:
            user = User.objects.create_user(
                username='demo', email='demo@photonix.org', password='demo')
            user.has_set_personal_info = True
            user.has_created_library = True
            user.has_configured_importing = True
            user.has_configured_image_analysis = True
            user.save()
        except IntegrityError:
            user = User.objects.get(username='demo')

        # Create Library
        try:
            library = Library.objects.get(
                name=DEMO_LIBRARY_NAME,
            )
        except Library.DoesNotExist:
            library = Library(
                name=DEMO_LIBRARY_NAME,
                classification_color_enabled=True,
                classification_location_enabled=True,
                classification_style_enabled=True,
                classification_object_enabled=True,
                classification_face_enabled=True,
                setup_stage_completed='Th'
            )
            library.save()

        # LibraryPath as locally mounted volume
        LibraryPath.objects.get_or_create(
            library=library,
            type='St',
            backend_type='Lo',
            path='/data/photos/',
            url='/photos/',
        )

        # Link User to Library
        # In dev environment user needs to be owner to access all functionality
        # but demo.photonix.org this could lead to the system being messed up
        owner = os.environ.get('ENV') == 'dev'
        LibraryUser.objects.get_or_create(
            library=library,
            user=user,
            owner=owner
        )

        # Record only newly downloaded photos, as before; files already on
        # disk were recorded when they were first fetched
        for path in new_paths:
            record_photo(path, library)

    def handle(self, *args, **options):
        classification_disabled = os.environ.get('CLASSIFICATION_DISABLED') == '1'
        dev = is_dev_environment()
        use_stored_outputs = classification_disabled and web_utils.demo_mode_enabled() and not dev

        if use_stored_outputs:
            # No classifier processes run: serve stored analysis results.
            # Pin mtimes to the fixture so the hourly rescan is a no-op.
            logger.info('CLASSIFICATION_DISABLED=1 - loading stored demo analysis results')
            try:
                download_demo_photos(pin_mtimes=True)
                counts = reset_demo()
            except Exception:
                # Do not crash-loop the container (set -e in system/run.sh);
                # the scheduled reset_demo job retries and fails visibly
                logger.exception('Loading stored demo analysis results failed')
                return
            logger.info(f'Demo data loaded: {counts}')
            return

        if classification_disabled:
            reason = 'ENV=dev' if dev else 'DEMO is not enabled'
            logger.warning(f'CLASSIFICATION_DISABLED=1 but {reason} - '
                           'recording sample photos instead of loading stored demo results')
        already_present = {
            demo_photo_path(url) for url in DEMO_PHOTO_URLS
            if is_valid_image(demo_photo_path(url))}
        present = download_demo_photos()
        new_paths = [path for path in present if path not in already_present]
        self.import_photos(new_paths)
