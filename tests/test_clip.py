"""Tests for the CLIP semantic-search analyzer.

Model-backed tests (tokenizer golden ids, image embedding, run_on_photo
upsert) require the CLIP model files, which the dev/test container exposes at
settings.MODEL_DIR/clip via the test_settings symlink. They skip cleanly when
those files aren't present. The GraphQL / search-merge tests don't need the
real model - they monkeypatch encode_text (or drive the index directly).
"""
import time
from pathlib import Path

import numpy as np
import pytest
from django.conf import settings

from .factories import LibraryFactory, LibraryUserFactory, PhotoFactory, PhotoFileFactory


# Golden CLIP BPE ids for "a photo of a dog": <|startoftext|>, a, photo, of, a,
# dog, <|endoftext|>, then zero-padded to context length 77. Computed once
# against the real vocab.json + merges.txt shipped with the model.
GOLDEN_DOG_IDS = [49406, 320, 1125, 539, 320, 1929, 49407]


def _clip_dir():
    return Path(settings.MODEL_DIR) / 'clip'


def _require_clip_model():
    if not (_clip_dir() / 'visual.int8.onnx').exists():
        pytest.skip('CLIP model files not present in MODEL_DIR')


def _require_clip_tokenizer():
    if not (_clip_dir() / 'vocab.json').exists():
        pytest.skip('CLIP tokenizer data not present in MODEL_DIR')


def _unit_vector(index, value=1.0, extra=None):
    """Return a normalised little-endian float32 512-vector with set components."""
    vector = np.zeros(512, dtype=np.float32)
    vector[index] = value
    if extra:
        for i, val in extra.items():
            vector[i] = val
    vector /= np.linalg.norm(vector)
    return vector.astype('<f4')


# ---------------------------------------------------------------------------
# Tokenizer
# ---------------------------------------------------------------------------

def test_clip_tokenizer_golden_ids():
    _require_clip_tokenizer()
    from photonix.classifiers.clip.tokenizer import ClipTokenizer

    tokenizer = ClipTokenizer(
        str(_clip_dir() / 'vocab.json'), str(_clip_dir() / 'merges.txt'))
    ids = tokenizer.encode('a photo of a dog')

    assert ids.dtype == np.int32
    assert ids.shape == (1, 77)
    nonzero = [int(i) for i in ids[0] if i != 0]
    assert nonzero == GOLDEN_DOG_IDS
    # Everything after the seven real tokens is zero padding.
    assert list(int(i) for i in ids[0][len(GOLDEN_DOG_IDS):]) == [0] * (77 - len(GOLDEN_DOG_IDS))


# ---------------------------------------------------------------------------
# Image embedding
# ---------------------------------------------------------------------------

def test_clip_predict_returns_unit_norm_512_vector():
    _require_clip_model()
    from photonix.classifiers.clip.model import ClipModel

    model = ClipModel()
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    embedding = model.predict(snow)

    assert embedding.dtype == np.float32
    assert embedding.shape == (512,)
    assert abs(float(np.linalg.norm(embedding)) - 1.0) < 1e-4


def test_clip_run_on_photo_upserts_embedding(db):
    _require_clip_model()
    from photonix.classifiers.clip.model import run_on_photo
    from photonix.photos.models import PhotoEmbedding

    photo = PhotoFileFactory().photo
    result_photo, results = run_on_photo(photo.id)

    # run_on_photo returns (photo, None) so the task-summary logger stays quiet.
    assert result_photo.id == photo.id
    assert results is None

    embeddings = PhotoEmbedding.objects.filter(photo=photo, type='C')
    assert embeddings.count() == 1
    row = embeddings.first()
    assert row.model_version == 20260719
    vector = np.frombuffer(row.embedding, dtype='<f4')
    assert vector.shape == (512,)
    assert abs(float(np.linalg.norm(vector)) - 1.0) < 1e-4

    # Re-running updates the existing row in place rather than duplicating it.
    run_on_photo(photo.id)
    assert PhotoEmbedding.objects.filter(photo=photo, type='C').count() == 1


# ---------------------------------------------------------------------------
# Similarity search (index + brute-force merge), no model needed
# ---------------------------------------------------------------------------

def test_semantic_search_embeddings_ranks_and_merges(db, settings, tmp_path):
    # Point MODEL_DIR at a scratch dir so the Annoy index files are written
    # somewhere disposable, not into the shared real models volume.
    settings.MODEL_DIR = str(tmp_path)
    from photonix.classifiers.clip.model import (
        retrain_clip_similarity_index, semantic_search_embeddings, _clip_index_paths)
    from photonix.photos.models import PhotoEmbedding

    library = LibraryFactory()
    photo_a = PhotoFactory(library=library)
    photo_b = PhotoFactory(library=library)
    PhotoEmbedding.objects.create(photo=photo_a, type='C', embedding=_unit_vector(0).tobytes())
    PhotoEmbedding.objects.create(photo=photo_b, type='C', embedding=_unit_vector(1).tobytes())

    indexed = retrain_clip_similarity_index(library.id)
    assert indexed == 2
    ann_path, ids_path, version_path = _clip_index_paths(library.id)
    assert ann_path.exists() and ids_path.exists() and version_path.exists()

    # A row added after the index build is only reachable via the brute-force
    # scan; sleep past the second-granularity index version so it qualifies.
    time.sleep(1.1)
    photo_c = PhotoFactory(library=library)
    PhotoEmbedding.objects.create(photo=photo_c, type='C', embedding=_unit_vector(2).tobytes())

    # Query aligned with photo_a (indexed) ranks it first.
    query_a = np.zeros(512, dtype=np.float32); query_a[0] = 1.0
    ranked_a = semantic_search_embeddings(library.id, query_a, first=10)
    assert ranked_a[0][0] == str(photo_a.id)

    # Query aligned with photo_c (index-miss) is found via the merge and ranks first.
    query_c = np.zeros(512, dtype=np.float32); query_c[2] = 1.0
    ranked_c = semantic_search_embeddings(library.id, query_c, first=10)
    assert ranked_c[0][0] == str(photo_c.id)
    assert str(photo_c.id) in {photo_id for photo_id, _ in ranked_c}

    # Scores are cosine similarities in descending order.
    scores = [score for _, score in ranked_a]
    assert scores == sorted(scores, reverse=True)
    assert scores[0] == pytest.approx(1.0, abs=1e-4)


def test_semantic_search_embeddings_empty_without_rows(db, settings, tmp_path):
    settings.MODEL_DIR = str(tmp_path)
    from photonix.classifiers.clip.model import semantic_search_embeddings

    library = LibraryFactory()
    query = np.zeros(512, dtype=np.float32); query[0] = 1.0
    assert semantic_search_embeddings(library.id, query, first=10) == []


# ---------------------------------------------------------------------------
# GraphQL semantic_search_photos: ordering, scoping, empty/disabled cases
# ---------------------------------------------------------------------------

SEMANTIC_QUERY = """
    query Semantic($libraryId: UUID!, $query: String!) {
        semanticSearchPhotos(libraryId: $libraryId, query: $query) {
            photo { id }
            score
        }
    }
"""


def _client_for(user):
    from .conftest import ApiClient
    return ApiClient(user=user)


def _patch_encode_text(monkeypatch, vector):
    from photonix.classifiers.clip import model as clip_model
    # Fixed query embedding; no real model needed.
    monkeypatch.setattr(clip_model.ClipModel, 'ensure_downloaded',
                        lambda self, lock_name=None: True)
    monkeypatch.setattr(clip_model.ClipModel, 'encode_text',
                        lambda self, query: np.asarray(vector, dtype=np.float32))


def test_semantic_search_photos_orders_by_score_and_scopes_to_library(db, settings, tmp_path, monkeypatch):
    settings.MODEL_DIR = str(tmp_path)  # no index files -> pure brute-force path
    from .utils import get_graphql_content
    from photonix.photos.models import PhotoEmbedding

    # Query vector points along dim 0.
    query_vector = np.zeros(512, dtype=np.float32); query_vector[0] = 1.0
    _patch_encode_text(monkeypatch, query_vector)

    library_user = LibraryUserFactory()
    library = library_user.library
    user = library_user.user

    photo_a = PhotoFactory(library=library)
    photo_b = PhotoFactory(library=library)
    # A aligns strongly with the query (~0.995), B less so (~0.707).
    PhotoEmbedding.objects.create(photo=photo_a, type='C', embedding=_unit_vector(0, extra={1: 0.1}).tobytes())
    PhotoEmbedding.objects.create(photo=photo_b, type='C', embedding=_unit_vector(0, value=0.5, extra={2: 0.5}).tobytes())

    # Another user's library + photo must never appear in these results.
    other_library_user = LibraryUserFactory()
    other_photo = PhotoFactory(library=other_library_user.library)
    PhotoEmbedding.objects.create(photo=other_photo, type='C', embedding=_unit_vector(0).tobytes())

    response = _client_for(user).post_graphql(
        SEMANTIC_QUERY, {'libraryId': str(library.id), 'query': 'a photo of a dog'})
    data = get_graphql_content(response)
    results = data['data']['semanticSearchPhotos']

    ids = [r['photo']['id'] for r in results]
    assert ids == [str(photo_a.id), str(photo_b.id)]
    assert str(other_photo.id) not in ids
    assert results[0]['score'] >= results[1]['score']


def test_semantic_search_photos_empty_query_returns_empty(db, monkeypatch):
    from .utils import get_graphql_content

    library_user = LibraryUserFactory()
    response = _client_for(library_user.user).post_graphql(
        SEMANTIC_QUERY, {'libraryId': str(library_user.library.id), 'query': '   '})
    data = get_graphql_content(response)
    assert data['data']['semanticSearchPhotos'] == []


def test_semantic_search_photos_no_embeddings_returns_empty(db, settings, tmp_path, monkeypatch):
    settings.MODEL_DIR = str(tmp_path)
    from .utils import get_graphql_content

    query_vector = np.zeros(512, dtype=np.float32); query_vector[0] = 1.0
    _patch_encode_text(monkeypatch, query_vector)

    library_user = LibraryUserFactory()
    response = _client_for(library_user.user).post_graphql(
        SEMANTIC_QUERY, {'libraryId': str(library_user.library.id), 'query': 'anything'})
    data = get_graphql_content(response)
    assert data['data']['semanticSearchPhotos'] == []


def test_semantic_search_photos_rejects_non_member_library(db, monkeypatch):
    from .utils import get_graphql_content
    from photonix.photos.models import PhotoEmbedding

    # A library the requesting user does NOT belong to, with an embedding in it.
    owner = LibraryUserFactory()
    victim_photo = PhotoFactory(library=owner.library)
    PhotoEmbedding.objects.create(photo=victim_photo, type='C', embedding=_unit_vector(0).tobytes())

    attacker = LibraryUserFactory()  # different user + library
    response = _client_for(attacker.user).post_graphql(
        SEMANTIC_QUERY, {'libraryId': str(owner.library.id), 'query': 'anything'})
    data = get_graphql_content(response)
    # Authorization short-circuits to [] without ever touching the model.
    assert data['data']['semanticSearchPhotos'] == []
