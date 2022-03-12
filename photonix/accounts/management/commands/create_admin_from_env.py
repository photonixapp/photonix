import os
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db.utils import IntegrityError

from photonix.photos.models import Library, LibraryPath, LibraryUser
from photonix.photos.utils.db import record_photo
from photonix.photos.utils.fs import determine_destination, download_file


User = get_user_model()


class Command(BaseCommand):
    help = 'Create admin user from environment variables ADMIN_USERNAME and ADMIN_PASSWORD'

    def create_admin(self):
        username = os.environ.get('ADMIN_USERNAME', 'admin')
        password = os.environ.get('ADMIN_PASSWORD')

        if not password:
            print('ADMIN_PASSWORD environment variable needs to be set')
            exit(1)

        # Get user
        user, created = User.objects.get_or_create(username=username)

        if not created:
            print(f'User "{username}" adready exists so not making changes')
            exit(1)
        else:
            user.set_password(password)
            user.has_set_personal_info = True
            user.save()
            print(f'User "{username}" created successfully and password set')

    def handle(self, *args, **options):
        self.create_admin()
