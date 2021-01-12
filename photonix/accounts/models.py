from django.contrib.auth.models import AbstractUser

from photonix.common.models import UUIDModel, VersionedModel
from django.db import models

class User(UUIDModel, AbstractUser):
    has_config_persional_info = models.BooleanField(default=False, help_text='true if user has registered persional info?')
    has_created_library = models.BooleanField(default=False, help_text='true if user has created his library?')
    has_configured_importing = models.BooleanField(default=False, help_text='true if user has configured importing?')
    has_configured_image_analysis = models.BooleanField(default=False, help_text='true if user has configured image analysis?')
