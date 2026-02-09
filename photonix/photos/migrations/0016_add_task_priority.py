from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('photos', '0015_add_task_memory_wait_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='priority',
            field=models.IntegerField(default=0, db_index=True),
        ),
        migrations.AlterModelOptions(
            name='task',
            options={'ordering': ['-priority', 'created_at']},
        ),
    ]
