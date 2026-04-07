from PIL import ImageOps


def apply_photo_rotation(image, photo_file):
    """Apply combined EXIF + user rotation to an image.

    Classifiers should use this instead of just ImageOps.exif_transpose()
    so that bounding boxes are stored relative to the final displayed
    orientation (after both EXIF and user rotation are applied).

    Args:
        image: PIL Image object
        photo_file: PhotoFile instance with exif_rotation and user_rotation fields

    Returns:
        Rotated PIL Image
    """
    # First apply EXIF rotation (handles camera orientation metadata)
    image = ImageOps.exif_transpose(image)

    # Then apply user rotation if any
    user_rotation = getattr(photo_file, 'user_rotation', 0) or 0
    if user_rotation == 90:
        # PIL rotate() goes counter-clockwise, so -90 for clockwise 90
        image = image.rotate(-90, expand=True)
    elif user_rotation == 180:
        image = image.rotate(180, expand=True)
    elif user_rotation == 270:
        # -270 counter-clockwise = 90 counter-clockwise = 270 clockwise
        image = image.rotate(-270, expand=True)

    return image
