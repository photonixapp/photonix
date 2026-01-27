# Generated manually for delayed task status

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('photos', '0017_add_exif_rotation'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='delayed_until',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
