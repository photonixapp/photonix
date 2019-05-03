import os
from pathlib import Path

from django.core.management.base import BaseCommand

from photonix.photos.utils.db import record_photo
from photonix.photos.utils.fs import determine_destination, download_file


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
        for url in URLS:
            dest_dir = determine_destination(url)
            fn = url.split('/')[-1]
            dest_path = str(Path(dest_dir) / fn)

            if not os.path.exists(dest_path):
                print('Fetching {} -> {}'.format(url, dest_path))
                download_file(url, dest_path)
                record_photo(dest_path)

    def handle(self, *args, **options):
        self.import_photos()
