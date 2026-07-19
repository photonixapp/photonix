import os
from pathlib import Path

from django.conf import settings
from PIL import Image


def test_downloading(tmpdir, monkeypatch):
    # Exercises the whole download path (info JSON, hash verification, file
    # placement, version.txt) against a faked HTTP layer so the test works
    # offline and doesn't pull hundreds of megabytes
    import hashlib
    import json

    from photonix.classifiers import base_model
    from photonix.classifiers.style.model import StyleModel

    graph_bytes = b'fake-tensorflow-graph-bytes' * 1024
    labels_bytes = b'fake\nlabels\n'
    model_info = {
        'style': {
            str(StyleModel.version): {
                'files': [
                    {
                        'filename': 'graph.pb',
                        'locations': ['https://models.invalid/style/graph.pb'],
                        'sha256': hashlib.sha256(graph_bytes).hexdigest(),
                    },
                    {
                        'filename': 'labels.txt',
                        'locations': ['https://models.invalid/style/labels.txt'],
                        'sha256': hashlib.sha256(labels_bytes).hexdigest(),
                    },
                ]
            }
        }
    }
    payloads = {
        settings.MODEL_INFO_URL: json.dumps(model_info).encode(),
        'https://models.invalid/style/graph.pb': graph_bytes,
        'https://models.invalid/style/labels.txt': labels_bytes,
    }

    class FakeResponse:
        status_code = 200

        def __init__(self, content):
            self.content = content

        def iter_content(self, chunk_size=None):
            yield self.content

    monkeypatch.setattr(base_model.requests, 'get',
                        lambda url, **kwargs: FakeResponse(payloads[url]))

    model_dir = tmpdir.mkdir('good')
    model = StyleModel(lock_name=None, model_dir=str(model_dir))

    assert (Path(model_dir) / 'style' / 'graph.pb').read_bytes() == graph_bytes
    assert (Path(model_dir) / 'style' / 'labels.txt').read_bytes() == labels_bytes
    with open(str(Path(model_dir) / 'style' / 'version.txt')) as f:
        assert f.read().strip() == str(model.version)

    # A corrupted download (hash mismatch) must install neither the file nor
    # the version marker, so the next run retries the download
    payloads['https://models.invalid/style/graph.pb'] = b'tampered-content'
    bad_dir = tmpdir.mkdir('bad')
    StyleModel(lock_name=None, model_dir=str(bad_dir))
    assert not (Path(bad_dir) / 'style' / 'graph.pb').exists()
    assert not (Path(bad_dir) / 'style' / 'version.txt').exists()


def test_color_predict():
    from PIL import Image

    from photonix.classifiers.color.model import ColorModel

    model = ColorModel()
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    result = model.predict(snow)
    expected = [('Azure', '0.826'), ('Gray', '0.106'), ('White', '0.038'), ('Black', '0.021'), ('Turquoise', '0.008')]
    actual = [(x, '{:.3f}'.format(y)) for x, y in result]
    assert expected == actual


def test_color_predict_non_rgb_modes(tmpdir):
    # Grayscale used to crash with IndexError and CMYK pixel channels were
    # compared to RGB targets without conversion
    from PIL import Image

    from photonix.classifiers.color.model import ColorModel

    model = ColorModel()
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')

    grayscale_path = str(Path(tmpdir) / 'gray.jpg')
    Image.open(snow).convert('L').save(grayscale_path)
    result = dict(model.predict(grayscale_path))
    assert result
    assert set(result.keys()) <= {'Gray', 'Black', 'White'}

    cmyk_path = str(Path(tmpdir) / 'cmyk.jpg')
    Image.open(snow).convert('CMYK').save(cmyk_path)
    result = model.predict(cmyk_path)
    assert result[0][0] == 'Azure'


def test_color_distance_hue_wraparound():
    # Hue is circular - a red at hue 0.99 must score as close to a red at
    # hue 0.01 as one 0.02 away in the middle of the range
    from photonix.classifiers.color.model import ColorModel

    model = ColorModel()
    red_high_hue = (255, 0, 15)   # Hue just below 1.0
    red_low_hue = (255, 15, 0)    # Hue just above 0.0
    green = (0, 255, 0)
    assert model.color_distance(red_high_hue, red_low_hue) > model.color_distance(red_high_hue, green)


def test_location_predict():
    from photonix.classifiers.location.model import LocationModel

    model = LocationModel()

    # London, UK - Tests multiple polygons of the UK
    result = model.predict(location=[51.5304213, -0.1286445])
    assert result['country']['name'] == 'United Kingdom'
    assert result['city']['name'] == 'London'
    assert result['city']['distance'] == 1405
    assert result['city']['population'] == 7556900

    # In the sea near Oia, Santorini, Greece - Country is inferred from city
    result = model.predict(location=[36.4396445, 25.3560936])
    assert result['country']['name'] == 'Greece'
    assert result['city']['name'] == 'Oía'
    assert result['city']['distance'] == 3132
    assert result['city']['population'] == 3376

    # Too far off the coast of John o' Groats, Scotland, UK - No match
    result = model.predict(location=[58.6876742, -3.4206862])
    assert result['country'] == None
    assert result['city'] == None

    # Vernier, Switzerland - Tests country code mainly (CH can be China in some codings)
    result = model.predict(location=[46.1760906, 5.9929043])
    assert result['country']['name'] == 'Switzerland'
    assert result['country']['code'] == 'CH'
    assert result['city']['country_name'] == 'Switzerland'
    assert result['city']['country_code'] == 'CH'

    # In France but close to a 'city' in Belgium - City should be limited to within border of country
    result = model.predict(location=[51.074323, 2.547278])
    assert result['country']['name'] == 'France'
    assert result['city']['country_name'] == 'France'
    assert result['city']['name'] == 'Téteghem'


def test_event_predict(tmpdir):
    # Photos taken on Dec 31 or Jan 1 must both get the user-facing
    # 'New Year' tag - 'New Year Start/End' are internal labels
    import shutil
    import subprocess

    from photonix.classifiers.event.model import EventModel

    model = EventModel()
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    cases = [
        ('2020:01:01 00:30:00', ['New Year']),
        ('2019:12:31 23:30:00', ['New Year']),
        ('2020:12:25 10:00:00', ['Christmas Day']),
        ('2020:06:15 10:00:00', []),
    ]
    for i, (date_str, expected) in enumerate(cases):
        path = str(Path(tmpdir) / f'event_{i}.jpg')
        shutil.copy2(snow, path)
        subprocess.run(['exiftool', f'-DateTimeOriginal={date_str}', '-overwrite_original', path], check=True)
        assert model.predict(path) == expected, date_str


def test_get_city_handles_country_code_missing_from_world_borders():
    # Country codes introduced after the world borders dataset was published
    # (XK for Kosovo, SS for South Sudan) used to raise KeyError
    from photonix.classifiers.location.model import LocationModel

    model = LocationModel.__new__(LocationModel)  # Skip model download in __init__
    model._loaded = True
    model.world = []  # Borders dataset has no entry for XK
    pristina = [''] * 15
    pristina[1] = 'Pristina'
    pristina[4] = '42.6629'
    pristina[5] = '21.1655'
    pristina[8] = 'XK'
    pristina[14] = '216870'
    model.cities = [pristina]

    city = model.get_city(lon=42.6629, lat=21.1655)
    assert city['name'] == 'Pristina'
    assert city['country_code'] == 'XK'
    assert city['country_name'] is None

    # predict() must not fabricate a country called None from such a city
    result = model.predict(location=[42.6629, 21.1655])
    assert result['city']['name'] == 'Pristina'
    assert result['country'] is None


def test_object_predict():
    from photonix.classifiers.object.model import ObjectModel

    model = ObjectModel()
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    result = model.predict(snow)

    assert len(result) == 3

    assert result[0]['label'] == 'Tree'
    assert '{0:.3f}'.format(result[0]['score']) == '0.602'
    assert '{0:.3f}'.format(result[0]['significance']) == '0.134'
    assert '{0:.3f}'.format(result[0]['x']) == '0.787'
    assert '{0:.3f}'.format(result[0]['y']) == '0.374'
    assert '{0:.3f}'.format(result[0]['width']) == '0.340'
    assert '{0:.3f}'.format(result[0]['height']) == '0.655'

    assert result[1]['label'] == 'Tree'
    assert '{0:.3f}'.format(result[1]['score']) == '0.525'
    assert '{0:.3f}'.format(result[1]['significance']) == '0.016'

    assert result[2]['label'] == 'Tree'
    assert '{0:.3f}'.format(result[2]['score']) == '0.453'
    assert '{0:.3f}'.format(result[2]['significance']) == '0.025'


def test_object_backbone_session_init_fast():
    # The object model moved off the full ONNX graph - whose embedded
    # control-flow NMS postprocessor took ORT ~60s to initialise, stalling the
    # lazy-load/idle-unload lifecycle - onto a backbone-only graph plus a numpy
    # postprocessor. Guard against a regression that reintroduces a
    # control-flow-heavy graph: building the ORT session alone must be quick.
    # The bound is deliberately generous to avoid CI flake.
    import time

    from photonix.classifiers.base_model import create_ort_session
    from photonix.classifiers.object.model import ObjectModel

    model = ObjectModel()  # ensures the backbone file is downloaded/present

    start = time.monotonic()
    session = create_ort_session(model._graph_file)
    elapsed = time.monotonic() - start

    assert session is not None
    assert elapsed < 10.0, f'ORT session init took {elapsed:.1f}s'


def test_style_predict():
    from photonix.classifiers.style.model import StyleModel

    model = StyleModel()
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')
    result = model.predict(snow)

    assert len(result) == 1
    assert result[0][0] == 'serene'
    # ONNX Runtime + PIL preprocessing (was 0.962 under TF); the parity report
    # confirmed the top-1 label is preserved with a max score drift <= 0.005.
    assert '{0:.3f}'.format(result[0][1]) == '0.957'

    # Unreadable/corrupt files must still return None so run_on_photo keeps any
    # existing tags (the has_results contract). The migration swapped the TF
    # eager decoder for PIL, which decodes many formats TF could not (e.g. CMYK
    # TIFFs) - but this particular fixture is a deflate-compressed TIFF whose
    # pixel mode Pillow cannot parse, so the decode still fails cleanly and
    # predict() returns None via its try/except, exactly as before.
    cmyk = str(Path(__file__).parent / 'photos' / 'cmyk.tif')
    result = model.predict(cmyk)
    assert result == None


def test_face_graph_cache_keys_match_unload_pattern():
    # Cache keys must embed the real graph_cache_key so ModelManager's
    # unload can find and free them - literal '{self.graph_cache_key}'
    # strings meant idle-unload freed nothing
    from photonix.classifiers.face.model import FaceModel
    from photonix.classifiers.model_manager import get_model_manager

    model = FaceModel()
    model._ensure_loaded()

    assert f'{model.graph_cache_key}:det' in model.graph_cache
    assert f'{model.graph_cache_key}:rec' in model.graph_cache
    face_keys = [k for k in model.graph_cache if k.startswith('face:')]
    assert len(face_keys) == 2

    get_model_manager()._clear_graph_cache('face', model)
    assert not [k for k in model.graph_cache if k.startswith('face:')]


def test_face_similarity_index_trained_per_library(db):
    # The ANN index files are saved per-library so they must only be
    # trained on that library's faces
    import json

    from photonix.classifiers.face.model import FaceModel, EMBEDDING_SIZE
    from .factories import LibraryFactory, PhotoFactory, PhotoTagFactory, TagFactory

    embeddings = {}
    libraries = {}
    for key in ['a', 'b']:
        library = LibraryFactory()
        libraries[key] = library
        photo = PhotoFactory(library=library)
        tag = TagFactory(library=library, name=f'Person {key}', type='F')
        embedding = [float(ord(key))] * EMBEDDING_SIZE
        embeddings[key] = embedding
        PhotoTagFactory(photo=photo, tag=tag, source='C', confidence=1.0,
                        extra_data=json.dumps({'face_embedding': embedding}))

    model = FaceModel.__new__(FaceModel)  # Skip model download in __init__
    model.library_id = str(libraries['a'].id)

    os.makedirs(Path(settings.MODEL_DIR) / 'face', exist_ok=True)
    model.retrain_face_similarity_index()

    with open(Path(settings.MODEL_DIR) / 'face' / f'{model.library_id}_faces_tag_ids.json') as f:
        tag_ids = json.loads(f.read())

    expected_tag_ids = {str(t.id) for t in libraries['a'].tags.filter(type='F')}
    assert set(tag_ids) == expected_tag_ids
    assert len(tag_ids) == 1


def test_downscale_for_inference():
    from photonix.classifiers.image_utils import downscale_for_inference

    # A large image is capped so its longest edge is exactly max_edge, and the
    # returned scale is orig_longest / new_longest
    large = Image.new('RGB', (4000, 2000))
    result, scale = downscale_for_inference(large, max_edge=1000)
    assert result.size == (1000, 500)
    assert max(result.size) == 1000
    assert abs(scale - 4.0) < 0.001

    # A small image (already within the cap) is returned untouched, scale 1.0
    small = Image.new('RGB', (800, 600))
    result, scale = downscale_for_inference(small, max_edge=1024)
    assert result is small
    assert result.size == (800, 600)
    assert scale == 1.0

    # max_edge of 0 disables capping entirely
    result, scale = downscale_for_inference(large, max_edge=0)
    assert result is large
    assert result.size == (4000, 2000)
    assert scale == 1.0


def test_object_session_reused():
    # The TF session must be created once and reused across predictions, not
    # rebuilt per photo
    from photonix.classifiers.object.model import ObjectModel

    model = ObjectModel()
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')

    result1 = model.predict(snow)
    session1 = model.session
    result2 = model.predict(snow)
    session2 = model.session

    assert session1 is not None
    assert session1 is session2
    assert [r['label'] for r in result1] == [r['label'] for r in result2]
    assert [round(r['score'], 6) for r in result1] == [round(r['score'], 6) for r in result2]


def test_style_session_reused():
    from photonix.classifiers.style.model import StyleModel

    model = StyleModel()
    snow = str(Path(__file__).parent / 'photos' / 'snow.jpg')

    result1 = model.predict(snow)
    session1 = model.session
    result2 = model.predict(snow)
    session2 = model.session

    assert session1 is not None
    assert session1 is session2
    assert result1 == result2


def test_unload_model_closes_session_and_clears_cache():
    # Unloading must drop every graph_cache entry for the classifier (including
    # the reused ':session' key) and mark the model unloaded. The object model
    # now runs on ONNX Runtime, whose InferenceSession has no close() - it is
    # freed by the deletion + gc.collect() unload_model performs.
    import time

    from photonix.classifiers.base_model import graph_cache
    from photonix.classifiers.object.model import ObjectModel
    from photonix.classifiers.model_manager import get_model_manager

    manager = get_model_manager()
    model = ObjectModel()
    model._ensure_loaded()

    # Register directly so we exercise unload_model without get_model's
    # memory/cooldown gating
    with manager._state_lock:
        manager._model_instances['object'] = model
        manager._last_used['object'] = time.time()

    assert [k for k in graph_cache if k.startswith('object:')]
    assert f'{model.graph_cache_key}:session' in graph_cache

    assert manager.unload_model('object') is True

    assert not [k for k in graph_cache if k.startswith('object:')]
    assert not manager.is_loaded('object')


def test_close_model_session_closes_closable_session():
    # Session cleanup must call close() on sessions that expose one; ONNX
    # Runtime sessions have no close() and are left for deletion + gc. Use a
    # fake closable session and a close-less one so both cleanup branches stay
    # covered regardless of which framework a model uses.
    from unittest.mock import MagicMock

    from photonix.classifiers.model_manager import get_model_manager

    manager = get_model_manager()

    fake_model = MagicMock()
    fake_model.session = MagicMock()  # has a callable close()
    manager._close_model_session('fake_closable', fake_model)
    fake_model.session.close.assert_called_once()

    # A session object without a close() attribute (like ORT) must not raise
    class SessionWithoutClose:
        pass

    ort_like_model = MagicMock()
    ort_like_model.session = SessionWithoutClose()
    manager._close_model_session('fake_ort', ort_like_model)  # must not raise


def test_face_predict_boxes_in_original_pixel_space(tmpdir):
    # After capping inference resolution, face boxes and keypoints must be
    # mapped back into the full-res pixel space of the (upscaled) original -
    # run_on_photo aligns faces from the full-res image, so coordinates staying
    # in downscaled space would wreck the ArcFace embeddings
    from photonix.classifiers.face.model import FaceModel

    model = FaceModel()
    small_path = str(Path(__file__).parent / 'photos' / 'faces' / 'Boris_Becker_0003.jpg')

    small_results = model.predict(small_path)
    assert len(small_results) == 1
    small_box = small_results[0]['box']

    small_img = Image.open(small_path)
    factor = 2500 / max(small_img.size)  # 250px fixture -> 2500px canvas, i.e. 10x
    large_size = (round(small_img.size[0] * factor), round(small_img.size[1] * factor))
    large_path = str(Path(tmpdir) / 'boris_large.jpg')
    small_img.resize(large_size, Image.Resampling.BILINEAR).save(large_path)

    large_results = model.predict(large_path)
    assert len(large_results) == 1
    large_box = large_results[0]['box']

    # Each box value should be ~factor (10x) the small-image detection, well
    # away from the ~4x that a non-scaled (downscaled-space) box would give
    for small_v, large_v in zip(small_box, large_box):
        expected = small_v * factor
        assert abs(large_v - expected) <= 0.06 * expected + 2, (small_box, large_box)

    # Keypoints must be scaled the same way
    for name, (kx, ky) in large_results[0]['keypoints'].items():
        sx, sy = small_results[0]['keypoints'][name]
        assert abs(kx - sx * factor) <= 0.06 * sx * factor + 2
        assert abs(ky - sy * factor) <= 0.06 * sy * factor + 2

    # And the box must sit within the full-res upscaled image bounds
    x, y, w, h = large_box
    assert 0 <= x and 0 <= y
    assert x + w <= large_size[0]
    assert y + h <= large_size[1]


def test_face_predict():
    # SCRFD detection + ArcFace embeddings. Embeddings are 512-D and
    # L2-normalized, so distances are calibrated differently from the old
    # FaceNet stack - we assert identity structure (same-identity nearer than
    # cross-identity, with a clear threshold margin) rather than exact goldens.
    import numpy as np

    from photonix.classifiers.face.model import (
        FaceModel, find_euclidean_distance, DISTANCE_THRESHOLD, EMBEDDING_SIZE)

    faces_dir = Path(__file__).parent / 'photos' / 'faces'

    model = FaceModel()
    model.library_id = '00000000-0000-0000-0000-000000000000'

    def embed_fixture(fn):
        # Detect the face, then embed the highest-confidence (planted "hero")
        # detection using its landmarks for proper ArcFace alignment.
        path = str(faces_dir / fn)
        detections = model.predict(path)
        assert detections, f'SCRFD detected no face in {fn}'
        best = max(detections, key=lambda d: d['confidence'])
        img = np.asarray(Image.open(path).convert('RGB'))
        return model.get_face_embedding(img, keypoints=best['keypoints'])

    TRAIN_FACES = [
        ('Boris_Becker_0003.jpg', 'Boris'),
        ('Boris_Becker_0004.jpg', 'Boris'),
        ('David_Beckham_0001.jpg', 'David'),
        ('David_Beckham_0002.jpg', 'David'),
    ]
    train_embeddings = [embed_fixture(fn) for fn, _ in TRAIN_FACES]
    train_identities = [ident for _, ident in TRAIN_FACES]
    training_data = list(enumerate(train_embeddings))

    # Embeddings are 512-D and unit-norm
    for emb in train_embeddings:
        vec = np.asarray(emb)
        assert vec.shape == (EMBEDDING_SIZE,)
        assert abs(np.linalg.norm(vec) - 1.0) < 1e-3

    # Boris_Becker_0005's nearest training face is a Boris, below threshold
    boris = embed_fixture('Boris_Becker_0005.jpg')
    nearest, distance = model.find_closest_face_tag_by_brute_force(boris, target_data=training_data)
    assert train_identities[nearest] == 'Boris'
    assert distance < DISTANCE_THRESHOLD
    assert abs(find_euclidean_distance(boris, train_embeddings[nearest]) - distance) < 1e-6

    # David_Beckham_0010's nearest is a David, below threshold
    david = embed_fixture('David_Beckham_0010.jpg')
    nearest, distance = model.find_closest_face_tag_by_brute_force(david, target_data=training_data)
    assert train_identities[nearest] == 'David'
    assert distance < DISTANCE_THRESHOLD

    # Barbara Becker has no match in the training set, so her nearest-neighbour
    # distance is ABOVE the match threshold
    barbara = embed_fixture('Barbara_Becker_0001.jpg')
    _, distance = model.find_closest_face_tag_by_brute_force(barbara, target_data=training_data)
    assert distance > DISTANCE_THRESHOLD

    # same-identity distance < threshold < cross-identity distance
    first_david_idx = train_identities.index('David')
    same_identity = find_euclidean_distance(boris, train_embeddings[0])
    cross_identity = find_euclidean_distance(boris, train_embeddings[first_david_idx])
    assert same_identity < DISTANCE_THRESHOLD < cross_identity

    # The ANN index agrees with the brute-force nearest neighbour
    os.makedirs(Path(settings.MODEL_DIR) / 'face', exist_ok=True)
    model.retrain_face_similarity_index(training_data=training_data)
    ann_nearest, ann_distance = model.find_closest_face_tag_by_ann(boris)
    assert train_identities[ann_nearest] == 'Boris'
    assert ann_distance < DISTANCE_THRESHOLD
    # Annoy stores vectors as float32, so its distance agrees with the float64
    # numpy recomputation only to within the float32 noise floor
    assert abs(find_euclidean_distance(boris, train_embeddings[ann_nearest]) - ann_distance) < 1e-4

    # Tidy up ANN index files
    for fn in [
        f'{model.library_id}_faces.ann',
        f'{model.library_id}_faces_tag_ids.json',
        f'{model.library_id}_retrained_version.txt',
    ]:
        try:
            os.remove(Path(settings.MODEL_DIR) / 'face' / fn)
        except OSError:
            pass
