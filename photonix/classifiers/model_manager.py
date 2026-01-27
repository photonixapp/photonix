"""
Model Manager for lazy loading and idle unloading of classifier models.

This module provides a singleton ModelManager that:
- Lazily loads ML models on first use (not at process startup)
- Tracks model usage and unloads idle models after a configurable timeout
- Checks available system memory before loading to prevent OOMKilled events
- Uses Redis locks for multi-process safety
- Staggers model loading to prevent all classifiers from loading simultaneously
"""

import gc
import logging
import threading
import time
from typing import Any, Dict, Optional, Type

import psutil
from redis_lock import Lock

from photonix.classifiers.base_model import graph_cache
from photonix.photos.utils.redis import redis_connection


logger = logging.getLogger(__name__)

# Redis key for tracking when a model was last loaded (for staggered startup)
LAST_MODEL_LOAD_KEY = 'classifier:last_model_load_time'

# Import classifier priorities from classification module (single source of truth)
# Higher number = higher priority (like k8s PriorityClass)
from photonix.photos.utils.classification import CLASSIFIER_PRIORITIES
DEFAULT_PRIORITY = 0  # Unknown classifiers get lowest priority


class InsufficientMemoryError(Exception):
    """Raised when not enough memory is available to load a model."""
    pass


class ModelManager:
    """
    Singleton manager for lazy loading and idle unloading of classifier models.

    Thread-safe via Redis locks for loading/unloading and a threading.Lock for
    internal state access.
    """
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        from django.conf import settings

        self._state_lock = threading.Lock()
        self._model_instances: Dict[str, Any] = {}  # classifier_name -> model instance
        self._last_used: Dict[str, float] = {}  # classifier_name -> timestamp
        self._idle_timeout = getattr(settings, 'CLASSIFIER_IDLE_TIMEOUT_SECONDS', 300)
        self._watchdog_interval = getattr(settings, 'CLASSIFIER_WATCHDOG_INTERVAL_SECONDS', 60)
        self._memory_buffer_mb = getattr(settings, 'CLASSIFIER_MEMORY_BUFFER_MB', 500)
        self._load_cooldown_seconds = getattr(settings, 'CLASSIFIER_LOAD_COOLDOWN_SECONDS', 15)
        self._watchdog_thread: Optional[threading.Thread] = None
        self._shutdown_event = threading.Event()
        self._initialized = True

        logger.info(
            f"ModelManager initialized: idle_timeout={self._idle_timeout}s, "
            f"watchdog_interval={self._watchdog_interval}s, "
            f"memory_buffer={self._memory_buffer_mb}MB, "
            f"load_cooldown={self._load_cooldown_seconds}s"
        )

    def start_watchdog(self):
        """Start the background watchdog thread for idle model unloading."""
        if self._watchdog_thread is not None and self._watchdog_thread.is_alive():
            return

        self._shutdown_event.clear()
        self._watchdog_thread = threading.Thread(
            target=self._watchdog_loop,
            name="ModelManager-Watchdog",
            daemon=True
        )
        self._watchdog_thread.start()
        logger.info("ModelManager watchdog started")

    def stop_watchdog(self):
        """Stop the watchdog thread gracefully."""
        self._shutdown_event.set()
        if self._watchdog_thread is not None:
            self._watchdog_thread.join(timeout=5)
            self._watchdog_thread = None
        logger.info("ModelManager watchdog stopped")

    def _watchdog_loop(self):
        """Background loop that checks for and unloads idle models."""
        while not self._shutdown_event.is_set():
            try:
                self._check_and_unload_idle_models()
            except Exception as e:
                logger.error(f"Error in watchdog loop: {e}")

            # Sleep in small increments to allow responsive shutdown
            for _ in range(self._watchdog_interval):
                if self._shutdown_event.is_set():
                    break
                time.sleep(1)

    def _check_and_unload_idle_models(self):
        """Check all loaded models and unload those that have been idle too long."""
        current_time = time.time()
        models_to_unload = []

        with self._state_lock:
            for name, last_used in self._last_used.items():
                idle_time = current_time - last_used
                if idle_time > self._idle_timeout:
                    models_to_unload.append((name, idle_time))

        for name, idle_time in models_to_unload:
            logger.info(f"Unloading idle model '{name}' (idle for {idle_time:.1f}s)")
            self.unload_model(name)

    def check_memory_available(self, required_mb: int) -> bool:
        """Check if enough memory is available to load a model.

        Args:
            required_mb: Memory required by the model in megabytes.

        Returns:
            True if sufficient memory is available, False otherwise.
        """
        available_mb = psutil.virtual_memory().available / (1024 * 1024)
        return available_mb >= (required_mb + self._memory_buffer_mb)

    def get_available_memory_mb(self) -> float:
        """Return available system memory in megabytes."""
        return psutil.virtual_memory().available / (1024 * 1024)

    def _check_load_cooldown(self) -> float:
        """Check if another model was recently loaded (staggered startup).

        Returns:
            Seconds remaining in cooldown, or 0 if ready to load.
        """
        try:
            last_load = redis_connection.get(LAST_MODEL_LOAD_KEY)
            if last_load:
                last_load_time = float(last_load)
                elapsed = time.time() - last_load_time
                remaining = self._load_cooldown_seconds - elapsed
                if remaining > 0:
                    return remaining
        except Exception as e:
            logger.warning(f"Error checking load cooldown: {e}")
        return 0

    def _record_model_load(self):
        """Record that a model was just loaded (for staggered startup)."""
        try:
            redis_connection.set(
                LAST_MODEL_LOAD_KEY,
                str(time.time()),
                ex=self._load_cooldown_seconds + 10  # Expire shortly after cooldown
            )
        except Exception as e:
            logger.warning(f"Error recording model load time: {e}")

    def _register_waiting(self, classifier_name: str):
        """Register that a classifier is waiting to load."""
        try:
            key = f'classifier:waiting:{classifier_name}'
            redis_connection.set(key, str(time.time()), ex=300)  # Expire after 5 min
        except Exception as e:
            logger.warning(f"Error registering waiting classifier: {e}")

    def _unregister_waiting(self, classifier_name: str):
        """Unregister a classifier from waiting list."""
        try:
            key = f'classifier:waiting:{classifier_name}'
            redis_connection.delete(key)
        except Exception as e:
            logger.warning(f"Error unregistering waiting classifier: {e}")

    def _is_highest_priority_waiting(self, classifier_name: str) -> bool:
        """Check if this classifier has the highest priority among those waiting."""
        my_priority = CLASSIFIER_PRIORITIES.get(classifier_name, DEFAULT_PRIORITY)

        try:
            # Check all known classifiers for waiting status
            for name, priority in CLASSIFIER_PRIORITIES.items():
                if priority > my_priority:  # Higher priority (higher number, like k8s)
                    key = f'classifier:waiting:{name}'
                    if redis_connection.exists(key):
                        return False
            return True
        except Exception as e:
            logger.warning(f"Error checking priority: {e}")
            return True  # On error, allow loading

    def get_model(self, classifier_name: str, model_class: Type, **kwargs) -> Any:
        """
        Get or lazily load a model instance.

        Args:
            classifier_name: Name of the classifier (e.g., 'object', 'face')
            model_class: The model class to instantiate
            **kwargs: Additional arguments for model instantiation

        Returns:
            Loaded model instance

        Raises:
            InsufficientMemoryError: If not enough memory is available to load the model,
                or if another model is still loading (cooldown period)
        """
        # Fast path: model already loaded
        with self._state_lock:
            if classifier_name in self._model_instances:
                self._last_used[classifier_name] = time.time()
                return self._model_instances[classifier_name]

        # Slow path: need to load the model (with Redis lock for multi-process safety)
        lock_name = f'model_manager_{classifier_name}'
        with Lock(redis_connection, lock_name):
            # Double-check after acquiring lock
            with self._state_lock:
                if classifier_name in self._model_instances:
                    self._last_used[classifier_name] = time.time()
                    return self._model_instances[classifier_name]

            # Memory check before loading
            required_mb = getattr(model_class, 'approx_ram_mb', 500)
            if not self.check_memory_available(required_mb):
                available_mb = self.get_available_memory_mb()
                logger.warning(
                    f"Insufficient memory to load {classifier_name} classifier: "
                    f"need {required_mb}MB, have {available_mb:.0f}MB"
                )
                raise InsufficientMemoryError(
                    f"Insufficient memory to load {classifier_name} classifier"
                )

            # Staggered startup: if another model loaded recently, enforce priority during cooldown
            cooldown_remaining = self._check_load_cooldown()
            if cooldown_remaining > 0:
                # Register as waiting for priority tracking during cooldown
                self._register_waiting(classifier_name)

                # During cooldown, only allow highest priority classifier to proceed
                if not self._is_highest_priority_waiting(classifier_name):
                    raise InsufficientMemoryError(
                        f"Higher priority classifier waiting to load"
                    )

                # Even highest priority must wait for cooldown to finish
                raise InsufficientMemoryError(
                    f"Load cooldown active ({cooldown_remaining:.0f}s remaining)"
                )

            logger.info(f"Loading model: {classifier_name}")
            start_time = time.time()

            # Record that we're loading now (before actual load to block others)
            self._record_model_load()

            # Unregister from waiting list if we were waiting
            self._unregister_waiting(classifier_name)

            model = model_class(**kwargs)

            with self._state_lock:
                self._model_instances[classifier_name] = model
                self._last_used[classifier_name] = time.time()

            elapsed = time.time() - start_time
            logger.info(f"Model '{classifier_name}' loaded in {elapsed:.2f}s")

            # Update the load timestamp again after loading completes
            # (so cooldown starts from when load finished, not started)
            self._record_model_load()

            return model

    def unload_model(self, classifier_name: str) -> bool:
        """
        Unload a model and free its memory.

        Args:
            classifier_name: Name of the classifier to unload

        Returns:
            True if model was unloaded, False if it wasn't loaded.
        """
        lock_name = f'model_manager_{classifier_name}'
        with Lock(redis_connection, lock_name):
            with self._state_lock:
                if classifier_name not in self._model_instances:
                    return False

                model = self._model_instances.pop(classifier_name)
                self._last_used.pop(classifier_name, None)

            # Clear from graph_cache (shared module-level dict)
            self._clear_graph_cache(classifier_name, model)

            # TensorFlow-specific cleanup
            self._tensorflow_cleanup(classifier_name, model)

            # Delete model instance and force garbage collection
            del model
            gc.collect()

            logger.info(f"Model '{classifier_name}' unloaded and memory freed")
            return True

    def _clear_graph_cache(self, classifier_name: str, model: Any):
        """Remove model entries from the shared graph_cache."""
        keys_to_remove = []
        for key in graph_cache:
            if key.startswith(f"{classifier_name}:"):
                keys_to_remove.append(key)

        for key in keys_to_remove:
            del graph_cache[key]
            logger.debug(f"Removed graph_cache key: {key}")

    def _tensorflow_cleanup(self, classifier_name: str, model: Any):
        """TensorFlow-specific memory cleanup."""
        try:
            import tensorflow as tf

            # Clear Keras backend session (helps with memory)
            if hasattr(tf, 'keras') and hasattr(tf.keras.backend, 'clear_session'):
                tf.keras.backend.clear_session()

        except ImportError:
            pass  # TensorFlow not available
        except Exception as e:
            logger.warning(f"TensorFlow cleanup for '{classifier_name}' had issues: {e}")

    def touch(self, classifier_name: str):
        """Update the last-used timestamp for a model (call after each task)."""
        with self._state_lock:
            if classifier_name in self._last_used:
                self._last_used[classifier_name] = time.time()

    def is_loaded(self, classifier_name: str) -> bool:
        """Check if a model is currently loaded."""
        with self._state_lock:
            return classifier_name in self._model_instances

    def get_status(self) -> Dict[str, Any]:
        """Return current status of all managed models (for debugging/monitoring)."""
        current_time = time.time()
        with self._state_lock:
            return {
                name: {
                    'loaded': True,
                    'idle_seconds': current_time - last_used,
                    'approx_ram_mb': getattr(
                        self._model_instances.get(name), 'approx_ram_mb', 'unknown'
                    )
                }
                for name, last_used in self._last_used.items()
            }


def get_model_manager() -> ModelManager:
    """Get the global ModelManager singleton instance."""
    return ModelManager()
