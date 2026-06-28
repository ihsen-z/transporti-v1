# Generated migration for avatar ImageField

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('users', '0003_blueprint_alignment'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='avatar',
            field=models.ImageField(blank=True, help_text='Profile photo file', null=True, upload_to='avatars/'),
        ),
    ]
