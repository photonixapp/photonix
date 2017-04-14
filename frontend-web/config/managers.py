from .models import GlobalSetting as GlobalSettingModel, UserSetting as UserSettingModel
from .model_manager import ModelManager
from .redis_manager import RedisManager


class GlobalSettings(ModelManager):
    def __init__(self):
        self._type = 'global_settings'
        self._model = GlobalSettingModel
        super().__init__()


class UserSettings(ModelManager):
    def __init__(self):
        self._type = 'user_settings'
        self._model = UserSettingModel
        super().__init__()


class GlobalState(RedisManager):
    def __init__(self):
        self._type = 'global_state'
        super().__init__()


class SessionState(RedisManager):
    def __init__(self):
        self._type = 'session_state'
        super().__init__()


global_settings = GlobalSettings()
user_settings = UserSettings()
global_state = GlobalState()
session_state = SessionState()
