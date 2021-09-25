# Manually created by someone who has no idea what they are doing.

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0004_alter_user_first_name'),
    ]

    operations = [
        migrations.RenameField(
            model_name='user',
            old_name='has_config_personial_info',
            new_name='has_config_personal_info',
        ),
    ]
