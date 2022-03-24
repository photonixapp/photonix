import operator
import sys
from collections import defaultdict
from colorsys import rgb_to_hsv
from pathlib import Path

import numpy as np
from PIL import Image


class ColorModel:
    version = 20210206
    approx_ram_mb = 120
    max_num_workers = 2

    def __init__(self):
        self.colors = {
            # Name: ((red, green, blue), ordering)

            'Red':                  ((120, 4, 20),      1),
            'Orange':               ((245, 133, 0),     2),
            'Amber':                ((234, 166, 30),    3),
            'Yellow':               ((240, 240, 39),    4),
            'Lime':                 ((168, 228, 26),    5),
            'Green':                ((7, 215, 7),       6),
            'Teal':                 ((16, 202, 155),    7),
            'Turquoise':            ((25, 225, 225),    8),
            'Aqua':                 ((10, 188, 245),    9),
            'Azure':                ((30, 83, 249),     10),
            'Blue':                 ((0, 0, 255),       11),
            'Purple':               ((127, 0, 255),     12),
            'Orchid':               ((190, 0, 255),     13),
            'Magenta':              ((233, 8, 200),     14),

            'White':                ((255, 255, 255),   15),
            'Gray':                 ((124, 124, 124),   16),
            'Black':                ((0, 0, 0),         17),
        }

    def predict(self, image_file, image_size=32, min_score=0.005):
        image = Image.open(image_file)
        image = image.resize((image_size, image_size), Image.BICUBIC)
        pixels = np.asarray(image)
        pixels = [j for i in pixels for j in i]

        summed_results = defaultdict(int)
        for i, pixel in enumerate(pixels):
            best_color = None
            best_score = 0
            for name, (target, _) in self.colors.items():
                score = self.color_distance(pixel, target)
                if score > best_score:
                    best_color = name
                    best_score = score
            if best_color:
                summed_results[best_color] += 1

        averaged_results = {}
        for key, val in summed_results.items():
            val = val / (image_size * image_size)
            if val >= min_score:
                averaged_results[key] = val

        sorted_results = sorted(averaged_results.items(), key=operator.itemgetter(1), reverse=True)
        return sorted_results

    def color_distance(self, a, b):
        # Colors are list of 3 floats (RGB) from 0.0 to 1.0
        a_h, a_s, a_v = rgb_to_hsv(a[0] / 255, a[1] / 255, a[2] / 255)
        b_h, b_s, b_v = rgb_to_hsv(b[0] / 255, b[1] / 255, b[2] / 255)
        diff_h = 1 - abs(a_h - b_h)  # Hue is more highly weighted than saturation and value
        diff_s = 1 - abs(a_s - b_s) * 0.5
        diff_v = 1 - abs(a_v - b_v) * 0.25
        score = diff_h * diff_s * diff_v
        return score


def run_on_photo(photo_id):
    model = ColorModel()
    sys.path.insert(0, str(Path(__file__).resolve().parent.parent))
    from photonix.classifiers.runners import results_for_model_on_photo, get_or_create_tag
    photo, results = results_for_model_on_photo(model, photo_id)

    if photo:
        from photonix.photos.models import PhotoTag
        photo.clear_tags(source='C', type='C')
        for name, score in results:
            tag = get_or_create_tag(library=photo.library, name=name, type='C', source='C', ordering=model.colors[name][1])
            PhotoTag(photo=photo, tag=tag, source='C', confidence=score, significance=score).save()

    return photo, results


if __name__ == '__main__':
    if len(sys.argv) != 2:
        print('Argument required: image file path')
        exit(1)

    _, results = run_on_photo(sys.argv[1])

    for result in results:
        print('{} (score: {:0.10f})'.format(result[0], result[1]))
