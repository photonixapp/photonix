import hashlib
import json
import os
import random
import shutil
import subprocess
import tempfile
from pathlib import Path
import logging

import requests
from redis_lock import Lock

from photonix.photos.utils.redis import redis_connection


graph_cache = {}

logger = logging.getLogger(__name__)


class BaseModel:
    def __init__(self, model_dir=None):
        global graph_cache
        self.graph_cache = graph_cache

        if model_dir:
            self.model_dir = model_dir
        else:
            try:
                from django.conf import settings
                self.model_dir = settings.MODEL_DIR
            except:
                self.model_dir = str(Path(__file__).parent.parent.parent / 'data' / 'models')

    @property
    def graph_cache_key(self):
        return '{}:{}'.format(self.name, self.model_dir)

    def get_model_info(self):
        from django.conf import settings
        response = requests.get(settings.MODEL_INFO_URL)
        models_info = json.loads(response.content)
        model_info = models_info[self.name][str(self.version)]
        return model_info

    def ensure_downloaded(self, lock_name=None):
        if self.graph_cache_key in self.graph_cache:
            return True

        version_file = os.path.join(self.model_dir, self.name, 'version.txt')
        if not lock_name:
            lock_name = 'classifier_{}_download'.format(self.name)

        with Lock(redis_connection, lock_name):
            try:
                with open(version_file) as f:
                    if f.read().strip() == str(self.version):
                        return True
            except FileNotFoundError:
                pass

            model_info = self.get_model_info()
            error = False

            for file_data in model_info['files']:
                final_path = os.path.join(self.model_dir, self.name, file_data['filename'])
                if not os.path.exists(final_path):
                    locations = file_data['locations']
                    index = random.choice(range(len(locations)))
                    location = locations.pop(index)
                    hash_sha256 = hashlib.sha256()
                    request = requests.get(location, stream=True)

                    if request.status_code != 200:
                        error = True
                        logger.error(f"Failed to fetch model for {location}: "
                                     f"Got {request.status_code}")
                        continue

                    # Download file to temporary location
                    with tempfile.NamedTemporaryFile(mode='w+b', delete=False) as f:
                        for chunk in request.iter_content(chunk_size=1024 * 1024):  # 1MB chunks
                            if chunk:  # filter out keep-alive new chunks
                                f.write(chunk)
                                hash_sha256.update(chunk)

                    # Move file to correct location if the hash matches
                    if hash_sha256.hexdigest() == file_data['sha256']:
                        dirname = os.path.dirname(final_path)
                        if not os.path.isdir(dirname):
                            os.makedirs(dirname)

                        if file_data.get('decompress'):
                            if file_data['filename'].endswith('.xz'):
                                xz_path = '{}.xz'.format(f.name)
                                shutil.move(f.name, xz_path)
                                subprocess.run(['unxz', xz_path])
                                final_path = final_path.replace('.xz', '')

                        shutil.move(f.name, final_path)
                    else:
                        error = True
                        logger.error(f"File downloaded from {location} is "
                                     "corrupt as indicated by bad hash")
                        # TODO: Delete badly downloaded file

            # Write version file
            with open(version_file, 'w') as f:
                if error:
                    f.write('ERROR\n')
                    return False
                else:
                    f.write('{}\n'.format(str(self.version)))
                    return True
