"""
Migration: Add PricingGrid model + is_revealed/revealed_at to Review
"""
from django.conf import settings
from django.db import migrations, models
import django.core.validators
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('logistics', '0006_add_return_trip_fields'),
    ]

    operations = [
        # L5: PricingGrid model
        migrations.CreateModel(
            name='PricingGrid',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('job_type', models.CharField(choices=[('TRANSPORT', 'Transport'), ('MOVING', 'Moving (Déménagement)')], db_index=True, help_text='Type de job (TRANSPORT ou MOVING)', max_length=20, unique=True)),
                ('base_rate', models.DecimalField(decimal_places=2, default=10, help_text='Tarif de base fixe (TND)', max_digits=8, validators=[django.core.validators.MinValueValidator(0)])),
                ('per_km_rate', models.DecimalField(decimal_places=3, default=0.35, help_text='Tarif par km (TND/km)', max_digits=6, validators=[django.core.validators.MinValueValidator(0)])),
                ('min_price', models.DecimalField(decimal_places=2, default=25, help_text='Prix minimum garanti (TND)', max_digits=8, validators=[django.core.validators.MinValueValidator(0)])),
                ('max_multiplier', models.DecimalField(decimal_places=2, default=1.5, help_text='Multiplicateur pour borne haute (ex: 1.5 = +50%)', max_digits=4, validators=[django.core.validators.MinValueValidator(1)])),
                ('is_active', models.BooleanField(default=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='pricing_updates', to=settings.AUTH_USER_MODEL)),
            ],
            options={
                'verbose_name': 'Grille tarifaire',
                'verbose_name_plural': 'Grilles tarifaires',
                'ordering': ['job_type'],
            },
        ),
    ]
