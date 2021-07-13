import asyncio
from pathlib import Path
from time import sleep

from asgiref.sync import sync_to_async
from asyncinotify import Inotify, Mask
from typing import Generator, AsyncGenerator
from django.conf import settings
from django.core.management.base import BaseCommand

from photonix.photos.utils.db import record_photo, move_or_rename_photo, delete_child_dir_all_photos
from photonix.photos.models import LibraryPath
from photonix.web.utils import logger


class Command(BaseCommand):
    """Management command to watch photo directory and create photo records in database."""

    help = 'Watches photo directories and creates relevant database records for all photos that are added or modified.'

    def watch_photos(self):
        """Management command to watch photo directory and create photo records in database."""
        watching_libraries = {}

        with Inotify() as inotify:

            @sync_to_async
            def get_libraries():
                return {l.path: l.library_id for l in LibraryPath.objects.filter(type='St', backend_type='Lo')}

            @sync_to_async
            def record_photo_async(photo_path, library_id, event_mask):
                record_photo(photo_path, library_id, event_mask)

            @sync_to_async
            def move_or_rename_photo_async(photo_old_path, photo_new_path, library_id):
                move_or_rename_photo(photo_old_path, photo_new_path, library_id)

            @sync_to_async
            def delete_child_dir_all_photos_async(photo_path, library_id):
                delete_child_dir_all_photos(photo_path, library_id)

            def get_directories_recursive(path: Path) -> Generator[Path, None, None]:
                """ Recursively list all directories under path, including path itself, if
                it's a directory.

                The path itself is always yielded before its children are iterated, so you
                can pre-process a path (by watching it with inotify) before you get the
                directory listing.

                Passing a non-directory won't raise an error or anything, it'll just yield
                nothing.
                """

                if path.is_dir():
                    yield path
                    for child in path.iterdir():
                        yield from get_directories_recursive(child)

            async def check_libraries():
                while True:
                    await asyncio.sleep(1)

                    current_libraries = await get_libraries()

                    for path, id in current_libraries.items():
                        if path not in watching_libraries:
                            for directory in get_directories_recursive(Path(path)):
                                logger.info(f'Watching new path: {directory}')
                                watch = inotify.add_watch(directory, Mask.MODIFY | Mask.CREATE | Mask.DELETE | Mask.CLOSE | Mask.MOVE)
                                watching_libraries[path] = (id, watch)

                    for path, (id, watch) in watching_libraries.items():
                        if path not in current_libraries:
                            logger.info(f'Removing old path: {path}')
                            inotify.rm_watch(watch)

                    await asyncio.sleep(4)

            async def handle_inotify_events():
                async for event in inotify:
                    if 'moved_from_attr_dict' in locals() and moved_from_attr_dict:
                        for potential_library_path, (potential_library_id, _) in watching_libraries.items():
                            if str(event.path).startswith(potential_library_path):
                                library_id = potential_library_id
                        photo_moved_from_path = moved_from_attr_dict.get('moved_from_path')
                        photo_moved_from_cookie = moved_from_attr_dict.get('moved_from_cookie')
                        moved_from_attr_dict = {}
                        if event.mask.name == 'MOVED_TO' and photo_moved_from_cookie == event.cookie:
                            logger.info(f'Moving or renaming the photo "{str(event.path)}" from library "{library_id}"')
                            await move_or_rename_photo_async(photo_moved_from_path, event.path, library_id)
                        else:
                            logger.info(f'Removing photo "{str(photo_moved_from_path)}" from library "{library_id}"')
                            await record_photo_async(photo_moved_from_path, library_id, 'MOVED_FROM')
                    elif Mask.CREATE in event.mask and event.path is not None and event.path.is_dir():
                        current_libraries = await get_libraries()
                        for path, id in current_libraries.items():
                            for directory in get_directories_recursive(event.path):
                                logger.info(f'Watching newly created child directory: {directory}')
                                watch = inotify.add_watch(directory, Mask.MODIFY | Mask.CREATE | Mask.DELETE | Mask.CLOSE | Mask.MOVE)
                                watching_libraries[path] = (id, watch)

                    elif event.mask in [Mask.CLOSE_WRITE, Mask.MOVED_TO, Mask.DELETE, Mask.MOVED_FROM] or event.mask.value == 1073741888:
                        photo_path = event.path
                        library_id = None
                        for potential_library_path, (potential_library_id, _) in watching_libraries.items():
                            if str(photo_path).startswith(potential_library_path):
                                library_id = potential_library_id
                        if event.mask in [Mask.DELETE, Mask.MOVED_FROM]:
                            if event.mask.name == 'MOVED_FROM':
                                moved_from_attr_dict = {
                                    'moved_from_path': event.path,
                                    'moved_from_cookie': event.cookie}
                            else:
                                logger.info(f'Removing photo "{photo_path}" from library "{library_id}"')
                                await record_photo_async(photo_path, library_id, event.mask.name)
                        elif event.mask.value == 1073741888:
                            logger.info(f'Delete child directory with its all photos "{photo_path}" to library "{library_id}"')
                            await delete_child_dir_all_photos_async(photo_path, library_id)
                        else:
                            logger.info(f'Adding photo "{photo_path}" to library "{library_id}"')
                            await record_photo_async(photo_path, library_id, event.mask.name)

            loop = asyncio.get_event_loop()
            loop.create_task(check_libraries())
            loop.create_task(handle_inotify_events())

            try:
                loop.run_forever()
            except KeyboardInterrupt:
                logger.info('Shutting down')
            finally:
                loop.run_until_complete(loop.shutdown_asyncgens())
                loop.close()


    def handle(self, *args, **options):
        try:
            self.watch_photos()
        except KeyboardInterrupt:
            exit(0)
