import uuid

from django.db import models
from django.utils import timezone


class UUIDModel(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    class Meta:
        abstract = True


class VersionedModel(models.Model):
    created_at = models.DateTimeField(blank=True, db_index=True)
    updated_at = models.DateTimeField(blank=True)

    class Meta:
        abstract = True

    def save(self, *args, **kwargs):
        now = timezone.now()
        if not self.created_at:
            self.created_at = now
        self.updated_at = now
        super(VersionedModel, self).save()
