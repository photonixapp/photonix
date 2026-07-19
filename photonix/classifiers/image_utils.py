from PIL import Image


DEFAULT_MAX_INFERENCE_SIZE = 1024


def _get_max_inference_size():
    try:
        from django.conf import settings
        return settings.CLASSIFIER_MAX_INFERENCE_SIZE
    except Exception:
        return DEFAULT_MAX_INFERENCE_SIZE


def downscale_for_inference(image, max_edge=None):
    """Resize a PIL image so its longest edge is at most ``max_edge`` pixels.

    Returns ``(image, scale)`` where ``scale`` is ``orig_longest / new_longest``
    (>= 1.0) so callers working in pixel space can map results back to the
    original resolution; it is exactly ``1.0`` when the image is returned
    unchanged. ``max_edge`` of 0 (or negative) disables capping. When
    ``max_edge`` is None it is read from ``CLASSIFIER_MAX_INFERENCE_SIZE``.
    """
    if max_edge is None:
        max_edge = _get_max_inference_size()

    if not max_edge or max_edge <= 0:
        return image, 1.0

    width, height = image.size
    longest = max(width, height)
    if longest <= max_edge:
        return image, 1.0

    ratio = max_edge / longest
    new_width = max(1, round(width * ratio))
    new_height = max(1, round(height * ratio))
    resized = image.resize((new_width, new_height), Image.Resampling.BILINEAR)
    scale = longest / max(new_width, new_height)
    return resized, scale
