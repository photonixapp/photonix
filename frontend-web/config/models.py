from django.db import models
from django.contrib.postgres.fields import JSONField


class SavedConfig(models.Model):
    '''
    Global state key/value store for the system. This model should not be used
    directly, but via the manager.Config class.
    '''
    key = models.CharField(max_length=64, primary_key=True)
    val = JSONField(null=True)
