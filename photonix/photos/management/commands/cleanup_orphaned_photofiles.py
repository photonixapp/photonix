from django.core.management.base import BaseCommand

from photonix.photos.utils.db import cleanup_orphaned_photofiles
from photonix.web.utils import logger


class Command(BaseCommand):
    help = 'Remove PhotoFile records whose source files no longer exist on disk, along with their cached thumbnails.'

    def handle(self, *args, **options):
        orphaned = cleanup_orphaned_photofiles()
        if orphaned:
            self.stdout.write(self.style.SUCCESS(f'Cleaned up {orphaned} orphaned PhotoFile record(s) and their thumbnails'))
        else:
            self.stdout.write('No orphaned PhotoFiles found')
