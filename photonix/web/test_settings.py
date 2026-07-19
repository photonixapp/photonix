import os
import tempfile

from .settings import *


DATABASES = {
    'default': {
        'ENGINE':   'django.db.backends.sqlite3',
        'NAME':     ':memory:',
        # 'OPTIONS': {
        #     # ...
        #     'timeout': 10,
        #     # ...
        # }
    }
}

DATA_DIR = tempfile.mkdtemp()
CACHE_DIR = str(Path(DATA_DIR) / 'cache')
MODEL_DIR = str(Path(DATA_DIR) / 'models')
PHOTO_RAW_PROCESSED_DIR = str(Path(DATA_DIR) / 'raw-photos-processed')
THUMBNAIL_ROOT = str(Path(CACHE_DIR) / 'thumbnails')

# Some classifier assets are placed directly in the real models dir
# (data/models/<name>) rather than published in the downloadable manifest, so
# their versions aren't fetchable over the network:
#   - location: the offline-built cities.bin dataset
#   - object/style: the ONNX graphs (object.onnx, style.onnx) whose new
#     version (20260719) isn't in the published models.json
#   - clip: the visual/textual ONNX encoders + tokenizer data, whose version
#     (20260719) also isn't in the published models.json
#   - face: the SCRFD detector + ArcFace recognizer ONNX graphs
#     (det_500m.onnx, w600k_mbf.onnx), version 20260719, not in models.json
# Expose those already-present artifacts to the tests via symlinks so each
# model loads offline through the version.txt short-circuit, exactly as the dev
# stack does. Models without a local dir keep their normal download behaviour.
for _model_name in ('location', 'object', 'style', 'clip', 'face'):
    _real_dir = str(Path('/data') / 'models' / _model_name)
    if os.path.isdir(_real_dir):
        os.makedirs(MODEL_DIR, exist_ok=True)
        _test_dir = os.path.join(MODEL_DIR, _model_name)
        if not os.path.exists(_test_dir):
            try:
                os.symlink(_real_dir, _test_dir)
            except OSError:
                pass