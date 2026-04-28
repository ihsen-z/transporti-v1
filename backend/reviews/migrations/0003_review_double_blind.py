"""
Migration: Add double-blind review fields (L4)
- is_revealed: True when both parties have submitted or auto-revealed after 7 days
- revealed_at: Timestamp when the review was revealed
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('reviews', '0002_blueprint_alignment'),
    ]

    operations = [
        migrations.AddField(
            model_name='review',
            name='is_revealed',
            field=models.BooleanField(
                default=False,
                help_text='True when both parties have submitted their review (or auto-revealed after 7 days)',
            ),
        ),
        migrations.AddField(
            model_name='review',
            name='revealed_at',
            field=models.DateTimeField(
                blank=True,
                null=True,
                help_text='Timestamp when the review was revealed',
            ),
        ),
    ]
