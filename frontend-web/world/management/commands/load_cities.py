from django.core.management.base import BaseCommand

from world.load import load_cities


class Command(BaseCommand):
    help = 'Loads all the point of cities and other info into the database'

    def handle(self, *args, **options):
        load_cities()
