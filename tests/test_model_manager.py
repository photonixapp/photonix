import time

import pytest

from photonix.classifiers.base_model import graph_cache
from photonix.classifiers.model_manager import (
    LAST_MODEL_LOAD_KEY, InsufficientMemoryError, ModelManager)
from photonix.photos.utils.redis import redis_connection


class FakeModel:
    """Stands in for a classifier model - cheap and counts instantiations."""
    approx_ram_mb = 1
    instances = 0

    def __init__(self, **kwargs):
        type(self).instances += 1


@pytest.fixture
def manager(monkeypatch):
    """A fresh ModelManager, isolated from the process-wide singleton."""
    monkeypatch.setattr(ModelManager, '_instance', None)
    manager = ModelManager()
    FakeModel.instances = 0
    yield manager
    manager.stop_watchdog()
    for name in list(manager._model_instances):
        manager.unload_model(name)
    redis_connection.delete(LAST_MODEL_LOAD_KEY)


def _clear_cooldown():
    redis_connection.delete(LAST_MODEL_LOAD_KEY)


def test_get_model_loads_once_and_caches(manager):
    model = manager.get_model('color', FakeModel)
    assert isinstance(model, FakeModel)
    assert FakeModel.instances == 1
    assert manager.is_loaded('color')

    # Second call must hit the fast path, not instantiate again
    assert manager.get_model('color', FakeModel) is model
    assert FakeModel.instances == 1

    status = manager.get_status()
    assert status['color']['loaded'] is True
    assert status['color']['approx_ram_mb'] == 1


def test_get_model_refuses_to_load_without_memory(manager, monkeypatch):
    monkeypatch.setattr(manager, 'check_memory_available', lambda required_mb: False)

    with pytest.raises(InsufficientMemoryError):
        manager.get_model('color', FakeModel)

    assert not manager.is_loaded('color')
    assert FakeModel.instances == 0


def test_check_memory_available_includes_buffer(manager, monkeypatch):
    class FakeVirtualMemory:
        available = 600 * 1024 * 1024  # 600MB

    monkeypatch.setattr(
        'photonix.classifiers.model_manager.psutil.virtual_memory',
        lambda: FakeVirtualMemory)

    # 600MB available, 500MB default buffer: 100MB model fits, 101MB doesn't
    assert manager.check_memory_available(100) is True
    assert manager.check_memory_available(101) is False


def test_load_cooldown_staggers_model_loading(manager):
    manager.get_model('color', FakeModel)

    # The successful load recorded a cooldown, so another classifier must wait
    with pytest.raises(InsufficientMemoryError, match='cooldown'):
        manager.get_model('style', FakeModel)
    assert not manager.is_loaded('style')

    # An already-loaded model is unaffected by the cooldown (fast path)
    assert manager.get_model('color', FakeModel) is not None

    # Once the cooldown expires the next model may load
    _clear_cooldown()
    manager.get_model('style', FakeModel)
    assert manager.is_loaded('style')


def test_lower_priority_classifier_yields_during_cooldown(manager):
    manager.get_model('color', FakeModel)

    # 'style' (priority 70) starts waiting during the cooldown
    manager._register_waiting('style')

    # 'object' (priority 60) must yield to it rather than race for memory
    with pytest.raises(InsufficientMemoryError, match='[Hh]igher priority'):
        manager.get_model('object', FakeModel)

    redis_connection.delete('classifier:waiting:style')


def test_idle_models_are_unloaded_and_graph_cache_cleared(manager):
    manager.get_model('color', FakeModel)
    graph_cache['color:/models/fake:graph'] = object()
    graph_cache['colorful:/models/fake:graph'] = object()  # Prefix must not match

    # Not idle for long enough: nothing happens
    manager._check_and_unload_idle_models()
    assert manager.is_loaded('color')

    # Simulate the idle timeout having passed
    with manager._state_lock:
        manager._last_used['color'] = time.time() - manager._idle_timeout - 1
    manager._check_and_unload_idle_models()

    assert not manager.is_loaded('color')
    assert 'color:/models/fake:graph' not in graph_cache
    assert 'colorful:/models/fake:graph' in graph_cache
    del graph_cache['colorful:/models/fake:graph']

    # Unloading again reports that there was nothing to do
    assert manager.unload_model('color') is False


def test_touch_keeps_idle_model_loaded(manager):
    manager.get_model('color', FakeModel)
    with manager._state_lock:
        manager._last_used['color'] = time.time() - manager._idle_timeout - 1

    manager.touch('color')
    manager._check_and_unload_idle_models()
    assert manager.is_loaded('color')


def test_watchdog_thread_starts_and_stops(manager):
    manager._watchdog_interval = 1
    manager.start_watchdog()
    thread = manager._watchdog_thread
    assert thread.is_alive()

    # Starting again must not spawn a second thread
    manager.start_watchdog()
    assert manager._watchdog_thread is thread

    manager.stop_watchdog()
    assert manager._watchdog_thread is None
    assert not thread.is_alive()


def test_model_manager_is_a_singleton():
    assert ModelManager() is ModelManager()


def test_should_exit_when_idle_lifecycle(manager):
    manager._exit_when_idle = True
    # Never loaded anything: stays running, so idle exit cannot loop
    assert manager.should_exit_when_idle() is False

    manager.get_model('color', FakeModel)
    assert manager.should_exit_when_idle() is False

    manager.unload_model('color')
    assert manager.should_exit_when_idle() is True


def test_should_exit_when_idle_waits_for_unload_in_progress(manager, monkeypatch):
    """The model leaves _model_instances while its Redis lock is still held;
    exiting then would leave the lock held until its TTL runs out."""
    import threading

    manager._exit_when_idle = True
    manager.get_model('color', FakeModel)
    in_cleanup = threading.Event()
    release = threading.Event()

    def blocking_cleanup(classifier_name, model):
        in_cleanup.set()
        release.wait(timeout=10)

    monkeypatch.setattr(manager, '_tensorflow_cleanup', blocking_cleanup)
    thread = threading.Thread(target=manager.unload_model, args=('color',))
    thread.start()
    try:
        assert in_cleanup.wait(timeout=5)
        assert not manager.is_loaded('color')
        assert manager.should_exit_when_idle() is False
    finally:
        release.set()
        thread.join(timeout=10)
    assert not thread.is_alive()
    assert manager.should_exit_when_idle() is True


def test_set_load_cooldown(manager):
    manager.set_load_cooldown(0)
    manager.get_model('color', FakeModel)
    # No cooldown: a second model loads straight after the first
    manager.get_model('style', FakeModel)
    assert FakeModel.instances == 2


def test_should_exit_when_idle_disabled_by_setting(manager):
    manager._exit_when_idle = False
    assert manager.should_exit_when_idle() is False
    manager.get_model('color', FakeModel)
    assert manager.should_exit_when_idle() is False
    manager.unload_model('color')
    assert manager.should_exit_when_idle() is False


@pytest.mark.parametrize('value,expected', [(None, True), ('1', True), ('0', False)])
def test_exit_when_idle_setting_from_env(monkeypatch, value, expected):
    import importlib

    from photonix.web import settings as settings_module

    if value is None:
        monkeypatch.delenv('CLASSIFIER_EXIT_WHEN_IDLE', raising=False)
    else:
        monkeypatch.setenv('CLASSIFIER_EXIT_WHEN_IDLE', value)
    try:
        assert importlib.reload(settings_module).CLASSIFIER_EXIT_WHEN_IDLE is expected
    finally:
        monkeypatch.delenv('CLASSIFIER_EXIT_WHEN_IDLE', raising=False)
        importlib.reload(settings_module)
