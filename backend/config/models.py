from django.db import models
from django.contrib.postgres.fields import JSONField


class GlobalSetting(models.Model):
    '''
    Global settings key/value store for the system. This model should not be
    used directly, but via the managers.GlobalSettings class.
    '''
    key = models.CharField(max_length=64, primary_key=True)
    val = JSONField(null=True)


class UserSetting(models.Model):
    '''
    User settings key/value store for the system. This model should not be
    used directly, but via the managers.UserSettings class.
    '''
    key = models.CharField(max_length=64, primary_key=True)
    val = JSONField(null=True)
