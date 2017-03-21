from .initial import initial_config
from .models import SavedConfig


class Config(object):
    '''
    Global state key/value store for the system. Backed by database/Django
    model. All getting and setting should happen via this class. Keys must be
    defined in initial.py before use. A value can be any type that is JSON
    serializable.
    '''

    def get(self, key):
        if key not in initial_config:
            raise KeyError('Key \'{}\' not in initial_config'.format(key))

        try:
            val = SavedConfig.objects.get(key=key).val
        except SavedConfig.DoesNotExist:
            val = initial_config[key]

        return val

    def set(self, key, val):
        if key not in initial_config:
            raise KeyError('Key \'{}\' not in initial_config'.format(key))

        try:
            saved_config = SavedConfig.objects.get(key=key)
        except SavedConfig.DoesNotExist:
            saved_config = SavedConfig(key=key)

        saved_config.val = val
        saved_config.save()

    def get_all(self):
        data = {}
        for key in initial_config.keys():
            data[key] = self.get(key)
        return data

    def set_initial(self):
        for key, val in initial_config.items():
            try:
                SavedConfig.objects.get(key=key)
            except SavedConfig.DoesNotExist:
                SavedConfig(key=key, val=val).save()

    def delete_old(self):
        active_keys = initial_config.keys()
        for saved_config in SavedConfig.objects.all():
            if saved_config.key not in active_keys:
                saved_config.delete()
