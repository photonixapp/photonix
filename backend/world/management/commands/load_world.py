from django.core.management.base import BaseCommand

from world.load import load_world


class Command(BaseCommand):
    help = 'Loads all the polygons for the countries in the world into the database'

    def handle(self, *args, **options):
        load_world()
