import argparse
import os
import requests
import shutil


# Mapping: (class, Name, groups)
STYLE_MAPPING = [
    (0, 'Bokeh', ['1543486@N25']),
    (1, 'Bright', ['799643@N24']),
    (2, 'Depth_of_Field', ['75418467@N00', '407825@N20']),
    (3, 'Detailed', ['1670588@N24', '1131378@N23']),
    (4, 'Ethereal', ['907784@N22']),
    (5, 'Geometric_Composition', ['46353124@N00']),
    (6, 'Hazy', ['38694591@N00']),
    (7, 'HDR', ['99275357@N00']),
    (8, 'Horror', ['29561404@N00']),
    (9, 'Long_Exposure', ['52240257802@N01']),
    (10, 'Macro', ['52241335207@N01']),
    (11, 'Melancholy', ['70495179@N00']),
    (12, 'Minimal', ['42097308@N00']),
    (13, 'Noir', ['42109523@N00']),
    (14, 'Romantic', ['54284561@N00']),
    (15, 'Serene', ['1081625@N25']),
    (16, 'Pastel', ['1055565@N24', '1371818@N25']),
    (17, 'Sunny', ['1242213@N23']),
    (18, 'Texture', ['70176273@N00']),
    (19, 'Vintage', ['1222306@N25', '1176551@N24']),
]


def run(image_path, images_per_style=500):
    for class_id, style, group_ids in STYLE_MAPPING:
        print('Get images for style: {}'.format(style))
        get_images_for_style(style, group_ids, image_path, images_per_style)

    # fetch_images(url_file, img_info_file, image_path)
    # generate_train_test_dataset(img_info_file, train_file, test_file, train_ratio=0.8)


def get_images_for_style(style, group_ids, image_path, num_images):
    params = {
        'api_key': 'd31c7cb60c57aa7483c5c80919df5371',
        'per_page': 500,  # 500 is the maximum allowed
        'content_type': 1,  # only photos
    }

    style_image_path = os.path.join(image_path, style)
    if os.path.exists(style_image_path):
        print('Directory already exists: {}'.format(style_image_path))
        return

    os.mkdir(style_image_path)
    images_info = []

    for page in range(10):
        if len(images_info) >= num_images:
            break

        params['page'] = page

        for group in group_ids:
            if len(images_info) >= num_images:
                break

            params['group_id'] = group

            url = ('https://api.flickr.com/services/rest/?'
                   'method=flickr.photos.search&format=json&nojsoncallback=1'
                   '&api_key={api_key}&content_type={content_type}'
                   '&group_id={group_id}&page={page}&per_page={per_page}')
            url = url.format(**params)

            # Make the request and ensure it succeeds.
            page_data = requests.get(url).json()
            if page_data['stat'] != 'ok':
                raise Exception('Something is wrong: API returned {}'.format(page_data['stat']))

            for photo_item in page_data['photos']['photo']:
                if len(images_info) >= num_images:
                    break
                image_url = _get_image_url(photo_item)
                image_filename = '{}.jpg'.format(photo_item['id'])
                image_file = os.path.join(style_image_path, image_filename)
                download_image(image_url, image_file)
                images_info.append((image_url, image_filename))

    info_file_path = os.path.join(image_path, style, 'images.csv')
    write_image_info(info_file_path, images_info)

    if len(images_info) < num_images:
        raise Exception('Not enough images, only find {}'.format(len(images_info)))


def _get_image_url(photo_item, size_flag=''):
    '''
    size_flag: string ['']
        See http://www.flickr.com/services/api/misc.urls.html for options.
            '': 500 px on longest side
            '_m': 240px on longest side
    '''
    url = 'http://farm{farm}.staticflickr.com/{server}/{id}_{secret}{size}.jpg'
    return url.format(size=size_flag, **photo_item)


def download_image(url, filename):
    try:
        if os.path.exists(filename):
            return True

        print(filename)
        r = requests.get(url, stream=True)
        if r.status_code == 200:
            with open(filename, 'wb') as f:
                r.raw.decode_content = True
                shutil.copyfileobj(r.raw, f)
                return True
        else:
            return False
    except KeyboardInterrupt:
        raise Exception()  # multiprocessing doesn't catch keyboard exceptions
    except Exception:
        return False


def write_image_info(path, images_info):
    with open(path, 'w') as f:
        for url, filename in images_info:
            f.write('{},{}\n'.format(url, filename))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(prog='PROG')
    parser.add_argument('--image-path', nargs='?', default=os.path.join(os.path.dirname(__file__), 'images'))
    parser.add_argument('--images-per-style', nargs='?', default=1000)

    vars = parser.parse_args()
    if not os.path.exists(vars.image_path):
        os.mkdir(vars.image_path)

    run(vars.image_path, vars.images_per_style)
