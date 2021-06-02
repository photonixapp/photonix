from pathlib import Path

from annoy import AnnoyIndex
import numpy as np
from PIL import Image

from photonix.classifiers.face.deepface import DeepFace
from photonix.classifiers.face.deepface.commons.distance import findEuclideanDistance


TRAIN_FACES = [
    'Boris_Becker_0003.jpg',
    'Boris_Becker_0004.jpg',
    'David_Beckham_0001.jpg',
    'David_Beckham_0002.jpg',
]
TEST_FACES = [
    # Test image, nearest match in TRAIN_FACES, distance (3DP)
    ('Boris_Becker_0005.jpg', 0, '9.614'),
    ('David_Beckham_0010.jpg', 2, '10.956'),
    ('Barbara_Becker_0001.jpg', 2, '15.736'),
]


def test_annoy_index():
    embedding_cache = []
    embedding_size = 128  # FaceNet output size
    t = AnnoyIndex(embedding_size, 'euclidean')

    for i, fn in enumerate(TRAIN_FACES):
        path = str(Path(__file__).parent / 'photos' / 'faces' / fn)
        image_data = Image.open(path)
        embedding = DeepFace.represent(np.asarray(image_data), model_name='Facenet')
        embedding_cache.append(embedding)
        t.add_item(i, embedding)

    t.build(3)  # Number of random forest trees

    for i, (fn, expected_nearest, expected_distance), in enumerate(TEST_FACES):
        path = str(Path(__file__).parent / 'photos' / 'faces' / fn)
        image_data = Image.open(path)
        embedding = DeepFace.represent(np.asarray(image_data), model_name='Facenet')
        nearest, distance = t.get_nns_by_vector(embedding, 1, include_distances=True)
        nearest = nearest[0]
        distance = distance[0]

        assert nearest == expected_nearest
        assert '{:.3f}'.format(distance) == expected_distance
        assert abs(findEuclideanDistance(embedding, embedding_cache[nearest]) - distance) < 0.000001
        # import pdb; pdb.set_trace()
        
