import os
import shutil
from hashlib import md5
from io import StringIO

from PIL import Image

from photonix.photos.models import LibraryPath
from photonix.photos.utils.db import record_photo
from photonix.photos.utils.fs import (determine_destination,
                                      find_new_file_name, mkdir_p)
from photonix.photos.utils.metadata import get_datetime


SYNOLOGY_THUMBNAILS_DIR_NAME = '/@eaDir'


class FileHashCache(object):
    '''
    Used with determine_same_file() function. Can keep hold of the previously
    opened orig and dest file contents. Can keep hold of all file-based and
    image-based hashes per file.
    '''
    file_hash_cache = {}
    file_data = {'orig': (None, None), 'dest': (None, None)}

    def reset(self):
        self.file_hash_cache = {}

    def get_file_hash(self, fn, hash_type):
        if fn in self.file_hash_cache and hash_type in self.file_hash_cache[fn]:
            return self.file_hash_cache[fn][hash_type]
        return None

    def set_file_hash(self, fn, hash_type, hash_val):
        if fn not in self.file_hash_cache:
            self.file_hash_cache[fn] = {}
        self.file_hash_cache[fn][hash_type] = hash_val

    def get_file(self, fn, file_type):
        if self.file_data[file_type][0] != fn:
            self.file_data[file_type] = (fn, open(fn, 'rb').read())
        return self.file_data[file_type][1]


def determine_same_file(origpath, destpath, fhc=None):
    '''
    First check if hashes of the two files match. If they don't match, they
    could still be the same image if metadata has changed so open the pixel
    data using PIL and compare hashes of that.
    '''
    if not fhc:
        fhc = FileHashCache()

    if len(fhc.file_hash_cache) > 1000:
        fhc.reset()

    orig_hash = fhc.get_file_hash(origpath, 'file')
    if not orig_hash:
        orig_hash = md5(fhc.get_file(origpath, 'orig')).hexdigest()
        fhc.set_file_hash(origpath, 'file', orig_hash)

    dest_hash = fhc.get_file_hash(destpath, 'file')
    if not dest_hash:
        dest_hash = md5(fhc.get_file(destpath, 'dest')).hexdigest()
        fhc.set_file_hash(destpath, 'file', dest_hash)

    if orig_hash == dest_hash:
        return True

    # Try matching on image data (ignoring EXIF)
    if os.path.splitext(origpath)[1][1:].lower() in ['jpg', 'jpeg', 'png', ]:
        orig_hash = fhc.get_file_hash(origpath, 'image')
        if not orig_hash:
            orig_hash = md5(Image.open(StringIO(fhc.get_file(origpath, 'orig'))).tobytes()).hexdigest()
            fhc.set_file_hash(origpath, 'image', orig_hash)

        dest_hash = fhc.get_file_hash(destpath, 'image')
        if not dest_hash:
            dest_hash = md5(Image.open(StringIO(fhc.get_file(destpath, 'dest'))).tobytes()).hexdigest()
            fhc.set_file_hash(destpath, 'image', dest_hash)

        if orig_hash == dest_hash:
            return True
    # TODO: Convert raw photos into temp jpgs to do proper comparison
    return False


def blacklisted_type(file):
    ext = file.split('.')[-1].lower()
    if ext in ['mov', 'mp4', 'mkv', 'xmp']:
        return True
    if file == '.DS_Store':
        return True
    return False

def import_photos_from_dir(orig, move=False):
    imported = 0
    were_duplicates = 0
    were_bad = 0

    for r, d, f in os.walk(orig):
        if SYNOLOGY_THUMBNAILS_DIR_NAME in r:
            continue
        for fn in sorted(f):
            filepath = os.path.join(r, fn)
            dest = determine_destination(filepath)
            if blacklisted_type(fn):
                # Blacklisted type
                were_bad += 1
            elif not dest:
                # No filters match this file type
                pass
            else:
                t = get_datetime(filepath)
                if t:
                    destpath = '%02d/%02d/%02d' % (t.year, t.month, t.day)
                    destpath = os.path.join(dest, destpath)
                    mkdir_p(destpath)
                    destpath = os.path.join(destpath, fn)

                    if filepath == destpath:
                        # File is already in the right place so be very careful not to do anything like delete it
                        pass
                    elif not os.path.exists(destpath):
                        if move:
                            shutil.move(filepath, destpath)
                        else:
                            shutil.copyfile(filepath, destpath)
                        record_photo(destpath)
                        imported += 1
                        print('IMPORTED  {} -> {}'.format(filepath, destpath))
                    else:
                        print('PATH EXISTS  {} -> {}'.format(filepath, destpath))
                        same = determine_same_file(filepath, destpath)
                        print('PHOTO IS THE SAME')
                        if same:
                            if move:
                                os.remove(filepath)
                                were_duplicates += 1
                                print('DELETED FROM SOURCE')
                        else:
                            print('NEED TO IMPORT UNDER DIFFERENT NAME')
                            exit(1)
                            destpath = find_new_file_name(destpath)
                            shutil.move(filepath, destpath)
                            record_photo(destpath)
                            imported += 1
                            # print 'IMPORTED  {} -> {}'.format(filepath, destpath)

                else:
                    print('ERROR READING DATE: {}'.format(filepath))
                    were_bad += 1

    if imported or were_duplicates:
        print('\n{} PHOTOS IMPORTED\n{} WERE DUPLICATES\n{} WERE BAD'.format(imported, were_duplicates, were_bad))


def import_photos_in_place(library_path):
    orig = library_path.path
    imported = 0
    were_bad = 0

    for r, d, f in os.walk(orig):
        if SYNOLOGY_THUMBNAILS_DIR_NAME in r:
            continue
        for fn in sorted(f):
            filepath = os.path.join(r, fn)
            if blacklisted_type(fn):
                # Blacklisted type
                were_bad += 1
            else:
                modified = record_photo(filepath, library_path.library)
                if modified:
                    imported += 1
                    print('IMPORTED  {}'.format(filepath))

    if imported:
        print('\n{} PHOTOS IMPORTED\n{} WERE BAD'.format(imported, were_bad))


def rescan_photo_libraries(paths=[]):
    library_paths = LibraryPath.objects.filter(type='St', backend_type='Lo')
    if paths:
        library_paths = library_paths.filter(path__in=paths)

    for library_path in library_paths:
        print(f'Searching path for changes {library_path.path}')
        library_path.rescan()
