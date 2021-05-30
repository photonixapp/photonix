import base64
import math
import os

import cv2
import numpy as np
from PIL import Image
from tensorflow.keras.preprocessing.image import load_img, save_img, img_to_array
from tensorflow.keras.applications.imagenet_utils import preprocess_input
from tensorflow.keras.preprocessing import image

from photonix.classifiers.face.deepface.commons import distance
from photonix.classifiers.face.mtcnn import MTCNN  # 0.1.0


def initialize_input(img1_path, img2_path = None):

	if type(img1_path) == list:
		bulkProcess = True
		img_list = img1_path.copy()
	else:
		bulkProcess = False

		if (
			(type(img2_path) == str and img2_path != None)  # exact image path, base64 image
			or (isinstance(img2_path, np.ndarray) and img2_path.any())  # numpy array
		):
			img_list = [[img1_path, img2_path]]
		else:  # analyze function passes just img1_path
			img_list = [img1_path]

	return img_list, bulkProcess


def initialize_detector(detector_backend):
	global face_detector

	if detector_backend == 'mtcnn':
		face_detector = MTCNN()

	else:
		raise ValueError('mtcnn is the only detector backend available')


def loadBase64Img(uri):
   encoded_data = uri.split(',')[1]
   nparr = np.fromstring(base64.b64decode(encoded_data), np.uint8)
   img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
   return img


def get_opencv_path():
	opencv_home = cv2.__file__
	folders = opencv_home.split(os.path.sep)[0:-1]

	path = folders[0]
	for folder in folders[1:]:
		path = path + "/" + folder

	return path+"/data/"


def load_image(img):
	exact_image = False
	if type(img).__module__ == np.__name__:
		exact_image = True

	base64_img = False
	if len(img) > 11 and img[0:11] == "data:image/":
		base64_img = True

	if base64_img == True:
		img = loadBase64Img(img)

	elif exact_image != True:  # image path passed as input
		if os.path.isfile(img) != True:
			raise ValueError("Confirm that ", img, " exists")

		img = cv2.imread(img)

	return img


def detect_face(img, detector_backend = 'opencv', grayscale = False, enforce_detection = True):
	img_region = [0, 0, img.shape[0], img.shape[1]]

	# if functions.preproces_face is called directly, then face_detector global variable might not been initialized.
	if not "face_detector" in globals():
		initialize_detector(detector_backend = detector_backend)

	if detector_backend == 'mtcnn':

		img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)  # mtcnn expects RGB but OpenCV read BGR
		detections = face_detector.detect_faces(img_rgb)

		if len(detections) > 0:
			detection = detections[0]
			x, y, w, h = detection["box"]
			detected_face = img[int(y):int(y+h), int(x):int(x+w)]
			return detected_face, [x, y, w, h]

		else:  # if no face detected
			if not enforce_detection:
				return img, img_region

			else:
				raise ValueError("Face could not be detected. Please confirm that the picture is a face photo or consider to set enforce_detection param to False.")

	else:
		detectors = ['mtcnn']
		raise ValueError("Valid backends are ", detectors," but you passed ", detector_backend)


def alignment_procedure(img, left_eye, right_eye):
	# this function aligns given face in img based on left and right eye coordinates

	left_eye_x, left_eye_y = left_eye
	right_eye_x, right_eye_y = right_eye

	#-----------------------
	# find rotation direction

	if left_eye_y > right_eye_y:
		point_3rd = (right_eye_x, left_eye_y)
		direction = -1  # rotate same direction to clock
	else:
		point_3rd = (left_eye_x, right_eye_y)
		direction = 1  # rotate inverse direction of clock

	#-----------------------
	# find length of triangle edges

	a = distance.findEuclideanDistance(np.array(left_eye), np.array(point_3rd))
	b = distance.findEuclideanDistance(np.array(right_eye), np.array(point_3rd))
	c = distance.findEuclideanDistance(np.array(right_eye), np.array(left_eye))

	#-----------------------

	# apply cosine rule

	if b != 0 and c != 0:  # this multiplication causes division by zero in cos_a calculation

		cos_a = (b*b + c*c - a*a)/(2*b*c)
		angle = np.arccos(cos_a)  # angle in radian
		angle = (angle * 180) / math.pi  # radian to degree

		#-----------------------
		# rotate base image

		if direction == -1:
			angle = 90 - angle

		img = Image.fromarray(img)
		img = np.array(img.rotate(direction * angle))

	#-----------------------

	return img # return img anyway


def align_face(img, detector_backend = 'mtcnn'):
	if detector_backend == 'mtcnn':

		img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB) # mtcnn expects RGB but OpenCV read BGR
		detections = face_detector.detect_faces(img_rgb)

		if len(detections) > 0:
			detection = detections[0]

			keypoints = detection["keypoints"]
			left_eye = keypoints["left_eye"]
			right_eye = keypoints["right_eye"]

			img = alignment_procedure(img, left_eye, right_eye)

		return img # return img anyway


def preprocess_face(img, target_size=(224, 224), grayscale = False, enforce_detection = True, detector_backend = 'opencv', return_region = False):
	img = load_image(img)
	base_img = img.copy()

	img, region = detect_face(img = img, detector_backend = detector_backend, grayscale = grayscale, enforce_detection = enforce_detection)

	#--------------------------

	if img.shape[0] > 0 and img.shape[1] > 0:
		img = align_face(img = img, detector_backend = detector_backend)
	else:

		if enforce_detection == True:
			raise ValueError("Detected face shape is ", img.shape,". Consider to set enforce_detection argument to False.")
		else:  # restore base image
			img = base_img.copy()

	#--------------------------

	# post-processing
	if grayscale == True:
		img = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

	img = cv2.resize(img, target_size)
	img_pixels = image.img_to_array(img)
	img_pixels = np.expand_dims(img_pixels, axis = 0)
	img_pixels /= 255 #normalize input in [0, 1]

	if return_region == True:
		return img_pixels, region
	else:
		return img_pixels


def find_input_shape(model):
	# face recognition models have different size of inputs
	# my environment returns (None, 224, 224, 3) but some people mentioned that they got [(None, 224, 224, 3)]. I think this is because of version issue.

	input_shape = model.layers[0].input_shape

	if type(input_shape) == list:
		input_shape = input_shape[0][1:3]
	else:
		input_shape = input_shape[1:3]

	if type(input_shape) == list:  # issue 197: some people got array here instead of tuple
		input_shape = tuple(input_shape)

	return input_shape
