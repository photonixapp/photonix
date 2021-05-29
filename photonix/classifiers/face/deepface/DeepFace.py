import warnings
warnings.filterwarnings("ignore")

import os
#os.environ['TF_CPP_MIN_LOG_LEVEL'] = '2'
os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

from photonix.classifiers.face.deepface.basemodels import Facenet
from photonix.classifiers.face.deepface.commons import functions, distance as dst

import tensorflow as tf
tf_version = int(tf.__version__.split(".")[0])
if tf_version == 2:
	import logging
	tf.get_logger().setLevel(logging.ERROR)

def build_model(model_name):

	"""
	This function builds a deepface model
	Parameters:
		model_name (string): face recognition or facial attribute model
			VGG-Face, Facenet, OpenFace, DeepFace, DeepID for face recognition
			Age, Gender, Emotion, Race for facial attributes

	Returns:
		built deepface model
	"""

	models = {
		'Facenet': Facenet.loadModel,
	}

	model = models.get(model_name)

	if model:
		model = model()
		#print('Using {} model backend'.format(model_name))
		return model
	else:
		raise ValueError('Invalid model_name passed - {}'.format(model_name))


def represent(img_path, model_name = 'VGG-Face', model = None, enforce_detection = True, detector_backend = 'mtcnn'):

	"""
	This function represents facial images as vectors.

	Parameters:
		img_path: exact image path, numpy array or based64 encoded images could be passed.

		model_name (string): VGG-Face, Facenet, OpenFace, DeepFace, DeepID, Dlib, ArcFace.

		model: Built deepface model. A face recognition model is built every call of verify function. You can pass pre-built face recognition model optionally if you will call verify function several times. Consider to pass model if you are going to call represent function in a for loop.

			model = DeepFace.build_model('VGG-Face')

		enforce_detection (boolean): If any face could not be detected in an image, then verify function will return exception. Set this to False not to have this exception. This might be convenient for low resolution images.

		detector_backend (string): set face detector backend as mtcnn, opencv, ssd or dlib

	Returns:
		Represent function returns a multidimensional vector. The number of dimensions is changing based on the reference model. E.g. FaceNet returns 128 dimensional vector; VGG-Face returns 2622 dimensional vector.
	"""

	if model is None:
		model = build_model(model_name)

	#---------------------------------

	#decide input shape
	input_shape =  input_shape_x, input_shape_y= functions.find_input_shape(model)

	#detect and align
	img = functions.preprocess_face(img = img_path
		, target_size=(input_shape_y, input_shape_x)
		, enforce_detection = enforce_detection
		, detector_backend = detector_backend)

	#represent
	embedding = model.predict(img)[0].tolist()

	return embedding


def detectFace(img_path, detector_backend = 'mtcnn'):

	"""
	This function applies pre-processing stages of a face recognition pipeline including detection and alignment

	Parameters:
		img_path: exact image path, numpy array or base64 encoded image

		detector_backend (string): face detection backends are mtcnn, opencv, ssd or dlib

	Returns:
		deteced and aligned face in numpy format
	"""

	functions.initialize_detector(detector_backend = detector_backend)

	img = functions.preprocess_face(img = img_path, detector_backend = detector_backend)[0] #preprocess_face returns (1, 224, 224, 3)
	return img[:, :, ::-1] #bgr to rgb
