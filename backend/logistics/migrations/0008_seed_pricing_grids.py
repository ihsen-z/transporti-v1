"""
Data migration: Seed default PricingGrid entries for TRANSPORT and MOVING.
"""
from django.db import migrations


def seed_pricing_grids(apps, schema_editor):
    PricingGrid = apps.get_model('logistics', 'PricingGrid')
    
    defaults = [
        {
            'job_type': 'TRANSPORT',
            'base_rate': 10.00,
            'per_km_rate': 0.350,
            'min_price': 25.00,
            'max_multiplier': 1.50,
            'is_active': True,
        },
        {
            'job_type': 'MOVING',
            'base_rate': 30.00,
            'per_km_rate': 0.500,
            'min_price': 80.00,
            'max_multiplier': 2.00,
            'is_active': True,
        },
    ]
    
    for grid_data in defaults:
        PricingGrid.objects.get_or_create(
            job_type=grid_data['job_type'],
            defaults=grid_data
        )


def reverse_seed(apps, schema_editor):
    PricingGrid = apps.get_model('logistics', 'PricingGrid')
    PricingGrid.objects.filter(job_type__in=['TRANSPORT', 'MOVING']).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('logistics', '0007_pricinggrid'),
    ]

    operations = [
        migrations.RunPython(seed_pricing_grids, reverse_seed),
    ]
