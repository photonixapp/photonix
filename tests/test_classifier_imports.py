import importlib

import pytest


CLASSIFIERS = [
    ('photonix.classifiers.color.model', 'ColorModel'),
    ('photonix.classifiers.object.model', 'ObjectModel'),
    ('photonix.classifiers.face.model', 'FaceModel'),
    ('photonix.classifiers.style.model', 'StyleModel'),
    ('photonix.classifiers.location.model', 'LocationModel'),
    ('photonix.classifiers.event.model', 'EventModel'),
]

# Classifiers that use lazy-loaded heavy dependencies (e.g. TensorFlow).
# We call their ensure methods to verify those deps are also importable.
LAZY_LOADERS = [
    ('photonix.classifiers.object.model', '_ensure_tensorflow'),
    ('photonix.classifiers.object.model', '_ensure_label_map_util'),
    ('photonix.classifiers.style.model', '_ensure_tensorflow'),
    ('photonix.classifiers.face.model', '_ensure_face_libs'),
]


@pytest.mark.parametrize('module_path,class_name', CLASSIFIERS,
                         ids=[c[1] for c in CLASSIFIERS])
def test_classifier_module_imports(module_path, class_name):
    """Verify classifier module can be imported (catches missing dependencies)."""
    module = importlib.import_module(module_path)
    cls = getattr(module, class_name)
    assert cls is not None


@pytest.mark.parametrize('module_path,func_name', LAZY_LOADERS,
                         ids=[f'{m.split(".")[-2]}.{f}' for m, f in LAZY_LOADERS])
def test_lazy_dependencies_importable(module_path, func_name):
    """Verify lazy-loaded dependencies (TensorFlow, etc.) can be imported."""
    module = importlib.import_module(module_path)
    ensure_fn = getattr(module, func_name)
    result = ensure_fn()
    assert result is not None
