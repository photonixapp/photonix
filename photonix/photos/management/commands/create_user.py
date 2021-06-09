from getpass import getpass
import sys

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from photonix.photos.models import Library, LibraryUser


User = get_user_model()


class Command(BaseCommand):
    '''Management command to create user and assign them to libararies.'''

    help = 'Assign library to user'

    def create_user(self, username, password):
        '''To create user and assign to libraries.'''
        if not username:
            username = input('\nPlease enter username: ')
        if User.objects.filter(username=username).exists():
            print(f'User "{username}" already exists')
            self.show_libraries_list(User.objects.get(username=username))
        else:
            self.validate_password(username, password)

    def show_libraries_list(self, user):
        '''Method to show library list.'''
        print('\nCurrent libraries:\n ')
        lib_num_obj_pair_list = []
        lib_sequence_list = []
        for count, lib_obj in enumerate(Library.objects.all(), start=1):
            print(f'  {count}) {lib_obj.name}')
            lib_num_obj_pair_list.append((count, lib_obj))
            lib_sequence_list.append(count)
        self.assign_user_to_library(lib_num_obj_pair_list, user, lib_sequence_list)

    def validate_password(self, username, password=None):
        '''Method to validate the password.'''
        if not password:
            password = getpass('Please enter password (hidden): ')
        if len(password) >= 8:
            user = User.objects.create(username=username)
            user.set_password(password)
            user.save()
            print(f'\nUser created with name "{username}"')
            self.show_libraries_list(user)
        else:
            print('Password must be at least 8 characters long!')
            self.validate_password(username)

    def assign_user_to_library(self, lib_num_obj_pair_list, user, lib_sequence_list):
        '''Method to assign user to selected libarary.'''
        entered_lib_num = input('\nPlease enter the number of a library you want the user to be able to access: ')
        if not (entered_lib_num.isdigit() and int(entered_lib_num) in lib_sequence_list):
            print('You have entered invalid library number.')
            self.assign_user_to_library(lib_num_obj_pair_list, user, lib_sequence_list)
        for sequence_number, obj in lib_num_obj_pair_list:
            if int(entered_lib_num) == sequence_number:
                LibraryUser.objects.get_or_create(library=obj, user=user, owner=True)
                print(f'\nUser "{user.username}" assigned to library "{obj.name}"\n')
                self.continue_the_process(lib_num_obj_pair_list, user, lib_sequence_list)

    def continue_the_process(self, lib_num_obj_pair_list, user, lib_sequence_list):
        '''Method to continue the process if user wants to allocate user object to another libraries.'''
        continue_or_not = input('Do you want to add user to another library? Enter Y or N: ')
        if continue_or_not.upper() == 'Y':
            self.assign_user_to_library(lib_num_obj_pair_list, user, lib_sequence_list)
        elif continue_or_not.upper() == 'N':
            sys.exit()  # we can also write here 'pass' but to avoid unnecessary loop running we used exit()
        else:
            print('Please enter only Y or N')
            self.continue_the_process(lib_num_obj_pair_list, user, lib_sequence_list)

    def add_arguments(self, parser):
        '''To pass argumentes in management command.'''
        # Optional or named arguments
        parser.add_argument('--username', type=str, help='Take username')
        parser.add_argument('--password', type=str, help='Take password')

    def handle(self, *args, **options):
        '''Method in which we call management command with passed arguments.'''
        self.create_user(options.get('username'), options.get('password'))
