import datetime as dt
import json
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageOps as PILImageOps

from photonix.classifiers.base_model import BaseModel, create_ort_session
from photonix.classifiers.clip.tokenizer import ClipTokenizer


VISUAL_FILE = os.path.join('clip', 'visual.int8.onnx')
TEXTUAL_FILE = os.path.join('clip', 'textual.onnx')
VOCAB_FILE = os.path.join('clip', 'vocab.json')
MERGES_FILE = os.path.join('clip', 'merges.txt')

# CLIP ViT-B/32 produces 512-dimensional embeddings.
EMBEDDING_SIZE = 512

# CLIP image preprocessing constants (RGB, channel-wise).
_MEAN = np.array([0.48145466, 0.4578275, 0.40821073], dtype=np.float32)
_STD = np.array([0.26862954, 0.26130258, 0.27577711], dtype=np.float32)
_CROP = 224


def _normalise(vector):
    """L2-normalise a 1-D embedding, guarding against a zero vector."""
    vector = np.asarray(vector, dtype=np.float32)
    norm = np.linalg.norm(vector)
    if norm == 0:
        return vector
    return (vector / norm).astype(np.float32)


def _preprocess(image):
    """Turn an already-oriented RGB PIL image into a 1x3x224x224 float32 tensor.

    Matches the reference CLIP transform: resize shortest side to 224 with
    bicubic resampling, centre-crop, scale to [0, 1] and normalise.
    """
    width, height = image.size
    scale = _CROP / min(width, height)
    image = image.resize((round(width * scale), round(height * scale)), Image.BICUBIC)
    width, height = image.size
    left, top = (width - _CROP) // 2, (height - _CROP) // 2
    image = image.crop((left, top, left + _CROP, top + _CROP))
    array = np.asarray(image, dtype=np.float32) / 255.0
    array = (array - _MEAN) / _STD
    return np.expand_dims(array.transpose(2, 0, 1), 0)


class ClipModel(BaseModel):
    """CLIP ViT-B/32 semantic embedding model.

    The visual (image) and textual (query) encoders load independently and
    lazily: the classifier processor only ever needs the visual encoder, and
    the web process only ever needs the textual encoder for search queries.
    Neither is loaded at construction or by ``load()``.
    """
    name = 'clip'
    version = 20260719
    approx_ram_mb = 350
    max_num_workers = 1

    def __init__(self, model_dir=None, lock_name=None):
        super().__init__(model_dir=model_dir)

        self._visual_file = os.path.join(self.model_dir, VISUAL_FILE)
        self._textual_file = os.path.join(self.model_dir, TEXTUAL_FILE)
        self._vocab_file = os.path.join(self.model_dir, VOCAB_FILE)
        self._merges_file = os.path.join(self.model_dir, MERGES_FILE)
        self._lock_name = lock_name

        # ModelManager's cleanup path pokes at a `session` attribute; keep one
        # present (and None) so it is simply skipped for this model.
        self.session = None
        self.visual_session = None
        self.visual_input_name = None
        self.textual_session = None
        self.textual_input_name = None
        self.textual_input_type = None
        self.tokenizer = None

        # Download model files eagerly (cheap), but don't load into memory yet
        self.ensure_downloaded(lock_name=lock_name)

    def load(self):
        # Both encoders load lazily and independently via _ensure_visual() /
        # _ensure_textual(); there is deliberately nothing to do here so that
        # touching one encoder never pulls in the other.
        pass

    def _ensure_visual(self):
        """Lazily build (or reuse) the image-encoder ONNX Runtime session."""
        if self.visual_session is not None:
            return
        session_key = f'{self.graph_cache_key}:visual'
        with self.load_lock():
            if session_key in self.graph_cache:
                self.visual_session = self.graph_cache[session_key]
            else:
                self.visual_session = create_ort_session(self._visual_file)
                self.graph_cache[session_key] = self.visual_session
        self.visual_input_name = self.visual_session.get_inputs()[0].name

    def _ensure_textual(self):
        """Lazily build (or reuse) the text-encoder ONNX Runtime session + tokenizer."""
        if self.textual_session is not None:
            return
        session_key = f'{self.graph_cache_key}:textual'
        with self.load_lock():
            if session_key in self.graph_cache:
                self.textual_session = self.graph_cache[session_key]
            else:
                self.textual_session = create_ort_session(self._textual_file)
                self.graph_cache[session_key] = self.textual_session
        text_input = self.textual_session.get_inputs()[0]
        self.textual_input_name = text_input.name
        self.textual_input_type = text_input.type
        if self.tokenizer is None:
            self.tokenizer = ClipTokenizer(self._vocab_file, self._merges_file)

    def predict(self, image_file, photo_file=None):
        """Return the L2-normalised 512-D image embedding as a float32 array."""
        self._ensure_visual()

        image = Image.open(image_file)
        if image.mode != 'RGB':
            image = image.convert('RGB')

        # Apply rotation: EXIF + user rotation if photo_file provided, exactly
        # as the object/face classifiers do before their preprocessing.
        if photo_file is not None:
            from photonix.photos.utils.rotation import apply_photo_rotation
            image = apply_photo_rotation(image, photo_file)
        else:
            image = PILImageOps.exif_transpose(image)

        tensor = _preprocess(image)
        embedding = self.visual_session.run(None, {self.visual_input_name: tensor})[0][0]
        return _normalise(embedding)

    def encode_text(self, query):
        """Return the L2-normalised 512-D text embedding for a query string."""
        self._ensure_textual()
        ids = self.tokenizer.encode(query)
        # The exported text encoder takes int32 ids, but stay robust to a model
        # rebuilt with an int64 input by matching whatever the session expects.
        if self.textual_input_type and 'int64' in self.textual_input_type:
            ids = ids.astype(np.int64)
        embedding = self.textual_session.run(None, {self.textual_input_name: ids})[0][0]
        return _normalise(embedding)


# ---------------------------------------------------------------------------
# Per-library approximate-nearest-neighbour similarity index
# ---------------------------------------------------------------------------
# CLIP embeddings are stored on PhotoEmbedding rows (type 'C'). A per-library
# Annoy index over those vectors gives fast semantic search; rows added after
# the index was last built are brute-force scanned and merged in, mirroring the
# face classifier's ANN + brute-force approach.

CLIP_EMBEDDING_TYPE = 'C'


def _clip_index_paths(library_id):
    from django.conf import settings
    base = Path(settings.MODEL_DIR) / 'clip'
    return (
        base / f'{library_id}_clip.ann',
        base / f'{library_id}_clip_photo_ids.json',
        base / f'{library_id}_clip_version.txt',
    )


def _clip_index_lock(library_id):
    from redis_lock import Lock
    from photonix.photos.utils.redis import redis_connection
    return Lock(redis_connection, f'clip_model_retrain_{library_id}', expire=60, auto_renewal=True)


def retrain_clip_similarity_index(library_id):
    """Build (or rebuild) the per-library Annoy index over CLIP embeddings.

    Returns the number of embeddings indexed. Writes nothing when the library
    has no CLIP embeddings yet.
    """
    from annoy import AnnoyIndex
    from photonix.photos.models import PhotoEmbedding

    ann_path, ids_path, version_path = _clip_index_paths(library_id)
    ann_path.parent.mkdir(parents=True, exist_ok=True)

    index = AnnoyIndex(EMBEDDING_SIZE, 'angular')
    photo_ids = []
    version = dt.datetime.utcnow().strftime('%Y%m%d%H%M%S')

    for embedding_row in PhotoEmbedding.objects.filter(
            photo__library_id=library_id, type=CLIP_EMBEDDING_TYPE).order_by('id'):
        vector = np.frombuffer(embedding_row.embedding, dtype='<f4')
        if vector.shape[0] != EMBEDDING_SIZE:
            continue
        index.add_item(len(photo_ids), vector)
        photo_ids.append(str(embedding_row.photo_id))

    if not photo_ids:
        return 0

    index.build(10)  # Number of random-projection trees

    with _clip_index_lock(library_id):
        index.save(str(ann_path))
        with open(ids_path, 'w') as f:
            json.dump(photo_ids, f)
        with open(version_path, 'w') as f:
            f.write(version)

    return len(photo_ids)


def semantic_search_embeddings(library_id, query_vector, first=50):
    """Rank a library's photos by cosine similarity to `query_vector`.

    Uses the Annoy index when present (score = 1 - d^2/2 for angular distance
    d, which equals cosine similarity for unit vectors) and additionally
    brute-force scans embeddings added after the index was last built. Results
    are deduplicated per photo keeping the highest score, sorted descending and
    capped at `first`. Returns a list of ``(photo_id_str, score)``.
    """
    from photonix.photos.models import PhotoEmbedding

    query_vector = np.asarray(query_vector, dtype=np.float32)
    ann_path, ids_path, version_path = _clip_index_paths(library_id)
    scores = {}

    version_date = None
    if os.path.exists(ann_path) and os.path.exists(ids_path):
        from annoy import AnnoyIndex
        index = AnnoyIndex(EMBEDDING_SIZE, 'angular')
        # Hold the lock only while reading the index/id-map/version so a
        # concurrent rebuild can't swap the files out from under us.
        with _clip_index_lock(library_id):
            index.load(str(ann_path))  # mmap, cheap per query
            with open(ids_path) as f:
                photo_ids = json.load(f)
            if os.path.exists(version_path):
                with open(version_path) as f:
                    raw = f.read().strip()
                if raw:
                    version_date = dt.datetime.strptime(
                        raw, '%Y%m%d%H%M%S').replace(tzinfo=dt.timezone.utc)

        if photo_ids:
            # Over-fetch a little so the brute-force merge below has room to
            # reorder the final `first` results.
            count = min(max(first * 4, first), len(photo_ids))
            indices, distances = index.get_nns_by_vector(
                query_vector, count, include_distances=True)
            for idx, distance in zip(indices, distances):
                score = 1.0 - (distance * distance) / 2.0
                photo_id = photo_ids[idx]
                if score > scores.get(photo_id, -1e9):
                    scores[photo_id] = score

    # Brute-force over rows the index doesn't cover (added/updated since build,
    # or all rows when there is no index yet).
    queryset = PhotoEmbedding.objects.filter(
        photo__library_id=library_id, type=CLIP_EMBEDDING_TYPE)
    if version_date is not None:
        queryset = queryset.filter(updated_at__gt=version_date)
    for embedding_row in queryset.only('photo_id', 'embedding'):
        vector = np.frombuffer(embedding_row.embedding, dtype='<f4')
        if vector.shape[0] != EMBEDDING_SIZE:
            continue
        score = float(np.dot(query_vector, vector))
        photo_id = str(embedding_row.photo_id)
        if score > scores.get(photo_id, -1e9):
            scores[photo_id] = score

    ranked = sorted(scores.items(), key=lambda item: item[1], reverse=True)
    return ranked[:first]


def semantic_search(library_id, query, first=50):
    """Encode `query` with CLIP and return ranked ``(photo_id_str, score)``."""
    from photonix.classifiers.model_manager import get_model_manager

    if not query or not query.strip():
        return []
    model = get_model_manager().get_model('clip', ClipModel)
    query_vector = model.encode_text(query)
    return semantic_search_embeddings(library_id, query_vector, first=first)


def run_on_photo(photo_id):
    from photonix.classifiers.model_manager import get_model_manager
    from photonix.classifiers.runners import get_photo_by_any_type

    photo = get_photo_by_any_type(photo_id)
    model = get_model_manager().get_model('clip', ClipModel)

    if photo:
        embedding = model.predict(photo.base_image_path, photo_file=photo.base_file)
        from photonix.photos.models import PhotoEmbedding
        PhotoEmbedding.objects.update_or_create(
            photo=photo,
            type=CLIP_EMBEDDING_TYPE,
            defaults={
                'model_version': model.version,
                'embedding': embedding.astype('<f4').tobytes(),
            },
        )
        # Return no results so the task-summary logger stays quiet - CLIP
        # produces an embedding, not tags.
        return photo, None

    # Bare file path (command-line use): just return the embedding.
    embedding = model.predict(photo_id)
    return None, embedding


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Argument required: image file path or Photo ID')
        exit(1)

    _, results = run_on_photo(sys.argv[1])
    print(results)
