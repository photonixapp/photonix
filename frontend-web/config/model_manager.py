from .initial import initial_data
from web.utils import notify_ui


class ModelManager(object):
    '''
    Settings key/value store base class for the system and user settings.
    Backed by database/Django model. All getting and setting should happen via
    this class. Keys must be defined in initial.py before use. A value can be
    any type that is JSON serializable.
    '''

    def __init__(self):
        self.set_initial()
        super().__init__()

    def set_initial(self):
        for key, val in initial_data[self._type].items():
            try:
                self._model.objects.get(key=key)
            except self._model.DoesNotExist:
                self._model(key=key, val=val).save()

    def get(self, key):
        if key not in initial_data[self._type]:
            raise KeyError('Key \'{}\' not in \'{}\''.format(key, self._type))

        try:
            val = self._model.objects.get(key=key).val
        except self._model.DoesNotExist:
            val = initial_data[self._type][key]

        return val

    def set(self, key, val):
        if key not in initial_data[self._type]:
            raise KeyError('Key \'{}\' not in \'{}\''.format(key, self._type))

        try:
            saved_config = self._model.objects.get(key=key)
        except self._model.DoesNotExist:
            saved_config = self._model(key=key)

        saved_config.val = val
        saved_config.save()
        notify_ui(self._type, {key: val})

    def increment(self, key):
        # self._model.objects.get(key=key).update(val=F('val') + 1)  # Doesn't work because of json db type
        setting = self._model.objects.get(key=key)
        setting.val += 1
        setting.save()
        notify_ui(self._type, {key: setting.val})

    def decrement(self, key):
        setting = self._model.objects.get(key=key)
        setting.val -= 1
        setting.save()
        notify_ui(self._type, {key: setting.val})

    def push(self, key, val):
        raise NotImplementedError()

    def pop(self, key):
        raise NotImplementedError()

    def get_all(self):
        data = {}
        for key in initial_data[self._type].keys():
            data[key] = self.get(key)
        return data

    def delete_obsolete(self):
        active_keys = initial_data[self._type].keys()
        for saved_config in self._model.objects.all():
            if saved_config.key not in active_keys:
                saved_config.delete()
