import asyncio
from pathlib import Path
from time import sleep

from asgiref.sync import sync_to_async
from asyncinotify import Inotify, Mask
from django.conf import settings
from django.core.management.base import BaseCommand

from photonix.photos.utils.db import record_photo
from photonix.photos.models import LibraryPath


class Command(BaseCommand):
    help = 'Watches photo directories and creates relevant database records for all photos that are added or modified.'

    def watch_photos(self):
        watching_libraries = {}

        with Inotify() as inotify:

            @sync_to_async
            def get_libraries():
                return {l.path: l.library_id for l in LibraryPath.objects.filter(type='St', backend_type='Lo')}

            @sync_to_async
            def record_photo_async(photo_path, library_id, event_mask):
                record_photo(photo_path, library_id, event_mask)

            async def check_libraries():
                while True:
                    await asyncio.sleep(1)

                    current_libraries = await get_libraries()

                    if inotify:
                        for path, id in current_libraries.items():
                            if path not in watching_libraries:
                                print('Watching new path:', path)
                                watch = inotify.add_watch(path, Mask.MODIFY | Mask.CREATE | Mask.DELETE | Mask.CLOSE | Mask.MOVE)
                                watching_libraries[path] = (id, watch)

                        for path, (id, watch) in watching_libraries.items():
                            if path not in current_libraries:
                                print('Removing old path:', path)
                                inotify.rm_watch(watch)

                    await asyncio.sleep(4)

            async def handle_inotify_events():
                async for event in inotify:
                    if event.mask in [Mask.CLOSE_WRITE, Mask.MOVED_TO, Mask.DELETE, Mask.MOVED_FROM]:
                        photo_path = event.path

                        library_id = None
                        for potential_library_path, potential_library_id in watching_libraries.items():
                            if str(photo_path).startswith(potential_library_path):
                                library_id = potential_library_id

                        if event.mask in [Mask.DELETE, Mask.MOVED_FROM]:
                            print(f'Removing photo "{photo_path}" from library "{library_id}"')
                        else:
                            print(f'Adding photo "{photo_path}" to library "{library_id}"')
                        await record_photo_async(photo_path, library_id, str(event.mask).split('.')[1])

            loop = asyncio.get_event_loop()
            loop.create_task(check_libraries())
            loop.create_task(handle_inotify_events())

            try:
                loop.run_forever()
            except KeyboardInterrupt:
                print('Shutting down')
            finally:
                loop.run_until_complete(loop.shutdown_asyncgens())
                loop.close()


    def handle(self, *args, **options):
        try:
            self.watch_photos()
        except KeyboardInterrupt:
            exit(0)
