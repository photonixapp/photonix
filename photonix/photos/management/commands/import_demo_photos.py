import os
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.utils import IntegrityError

from photonix.photos.models import Library, LibraryPath, LibraryUser
from photonix.photos.utils.db import record_photo
from photonix.photos.utils.fs import determine_destination, download_file
from photonix.web.utils import logger


User = get_user_model()


URLS = [
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
]


class Command(BaseCommand):
    help = 'Downloads sample photos for displaying on the demo site'

    def import_photos(self):
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
                name='Demo Library',
            )
        except Library.DoesNotExist:
            library = Library(
                name='Demo Library',
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

        # Add photos
        for url in URLS:
            dest_dir = determine_destination(url)
            fn = url.split('/')[-1]
            dest_path = str(Path(dest_dir) / fn)

            if not os.path.exists(dest_path):
                logger.info('Fetching {} -> {}'.format(url, dest_path))
                download_file(url, dest_path)
                record_photo(dest_path, library)

    def handle(self, *args, **options):
        self.import_photos()
