from django.core.management.base import BaseCommand

from photonix.photos.utils.demo import FIXTURE_PATH, export_demo_fixture


class Command(BaseCommand):
    help = 'Writes the Demo Library and its stored analysis results to the demo fixture. Refuses while any demo photo has an unfinished task.'

    def add_arguments(self, parser):
        parser.add_argument('--path', default=str(FIXTURE_PATH), help='Where to write the fixture')

    def handle(self, *args, **options):
        counts = export_demo_fixture(options['path'])
        for label, count in counts.items():
            self.stdout.write(f'{label}: {count}')
        self.stdout.write(f'Fixture written to {options["path"]}')
