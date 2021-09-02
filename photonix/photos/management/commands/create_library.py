import os
import argparse
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.utils import IntegrityError

from photonix.photos.models import Library, LibraryPath, LibraryUser
from photonix.photos.utils.db import record_photo
from photonix.photos.utils.fs import determine_destination, download_file


User = get_user_model()


class Command(BaseCommand):
    help = 'Create a library for a user'

    def create_library(self, username, library_name, path):
        # Get user
        user = User.objects.get(username=username)
        # Create Library
        library, _ = Library.objects.get_or_create(
            name=library_name,
        )
        library_path, _ = LibraryPath.objects.get_or_create(
            library=library,
            type='St',
            backend_type='Lo',
            path=path,
        )
        library_user, _ = LibraryUser.objects.get_or_create(
            library=library,
            user=user,
            owner=True,
        )

        print(f'Library "{library_name}" with path "{path}" created successfully for user "{username}"')

    def is_path_dir(self, path):
        if os.path.isdir(path):
            return path
        else:
            raise argparse.ArgumentTypeError(f"{path} is not a valid folder")

    def add_arguments(self, parser):
        # Positional arguments
        parser.add_argument('username', type=str)
        parser.add_argument('library_name', type=str)
        parser.add_argument('--path', type=self.is_path_dir, default='/data/photos')

    def handle(self, *args, **options):
        self.create_library(options['username'], options['library_name'], options['path'])
