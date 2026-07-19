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

# Classifiers that use lazy-loaded heavy dependencies (e.g. TensorFlow, ONNX
# Runtime). We call their ensure methods to verify those deps are importable.
LAZY_LOADERS = [
    ('photonix.classifiers.base_model', 'ensure_tensorflow'),
    ('photonix.classifiers.base_model', 'ensure_onnxruntime'),
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


def test_face_model_imports_without_tensorflow():
    """The face stack now runs on ONNX Runtime (SCRFD + ArcFace); importing it
    must not drag in TensorFlow. Run in a clean subprocess so the assertion is
    independent of whether another test in this session imported TF."""
    import subprocess
    import sys

    code = (
        'import importlib, sys\n'
        'importlib.import_module("photonix.classifiers.face.model")\n'
        'sys.exit(1 if "tensorflow" in sys.modules else 0)\n'
    )
    result = subprocess.run([sys.executable, '-c', code], capture_output=True, text=True)
    assert result.returncode == 0, (
        f'face model import pulled in tensorflow\n{result.stdout}\n{result.stderr}')
