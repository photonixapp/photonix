from collections import defaultdict
from colorsys import rgb_to_hsv
import operator
import sys

import numpy as np
from PIL import Image


class ColorModel:
    version = 0
    approx_ram_mb = 120
    max_num_workers = 2

    def __init__(self):
        self.colors = {
            # Name: (red, green, blue)

            # 'Red':                  (255, 0, 0),
            # 'Yellow':               (255, 255, 0),
            # 'Green':                (0, 255, 0),
            # 'Cyan':                 (0, 255, 255),
            # 'Blue':                 (0, 0, 255),
            # 'Magenta':              (255, 0, 255),

            'Red':                  (225, 32, 0),
            'Dark orange':          (162, 70, 21),
            'Orange':               (255, 124, 0),
            'Pale pink':            (255, 159, 156),
            'Lemon yellow':         (255, 250, 0),
            'School bus yellow':    (255, 207, 0),
            'Green':                (144, 226, 0),
            'Dark lime green':      (0, 171, 0),
            'Cyan':                 (0, 178, 212),
            'Blue':                 (0, 98, 198),
            'Violet':               (140, 32, 186),
            'Pink':                 (245, 35, 148),

            'White':                (255, 255, 255),
            'Gray':                 (124, 124, 124),
            'Black':                (0, 0, 0),
        }

    def predict(self, image_file, image_size=32, min_score=0):
        image = Image.open(image_file)
        image = image.resize((1000, 1000), Image.BICUBIC)  # Remove sensor noise/grain
        image = image.resize((image_size, image_size), Image.NEAREST)  # Get the interesting colors without muddying them
        pixels = np.asarray(image)
        pixels = [j for i in pixels for j in i]

        summed_results = defaultdict(float)
        for i, pixel in enumerate(pixels):
            best_color = None
            best_score = 0
            for name, target in self.colors.items():
                score = self.color_distance(pixel, target)
                if score > best_score:
                    best_color = name
                    best_score = score
            if best_color:
                summed_results[best_color] += score

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
        diff_h = 1 - abs(a_h - b_h)
        diff_s = 1 - abs(a_s - b_s)
        diff_v = 1 - abs(a_v - b_v)
        score = diff_h * diff_s * diff_v
        return score


if __name__ == '__main__':
    model = ColorModel()
    if len(sys.argv) != 2:
        print('Argument required: image file path')
        exit(1)

    results = model.predict(sys.argv[1])

    for result in results:
        print('{} (score: {:0.10f})'.format(result[0], result[1]))
