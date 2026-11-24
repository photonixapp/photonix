from django.core.management.base import BaseCommand, CommandError

from photonix.photos.utils.demo import RESET_DEV_REFUSAL, RESET_REFUSAL, is_dev_environment, reset_demo
from photonix.web import utils as web_utils


class Command(BaseCommand):
    help = 'Deletes every user, library and photo record and reloads the demo fixture. Refuses unless DEMO is enabled.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--allow-dev', action='store_true',
            help='Allow running when ENV=dev (resets the development database)')

    def handle(self, *args, **options):
        if not web_utils.demo_mode_enabled():
            raise CommandError(RESET_REFUSAL)
        if is_dev_environment() and not options['allow_dev']:
            raise CommandError(RESET_DEV_REFUSAL)
        counts = reset_demo(allow_dev=options['allow_dev'])
        for label, count in counts.items():
            self.stdout.write(f'{label}: {count}')
        self.stdout.write('Demo reset complete')
