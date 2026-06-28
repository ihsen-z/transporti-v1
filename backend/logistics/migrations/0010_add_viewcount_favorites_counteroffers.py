# Generated manually — Django 4.2+ compatible
from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
        ('logistics', '0009_add_delivery_job_type'),
    ]

    operations = [
        # P1-05: Add view_count to TransportJob
        migrations.AddField(
            model_name='transportjob',
            name='view_count',
            field=models.PositiveIntegerField(default=0, help_text='Number of times the job detail page was viewed by non-owners'),
        ),

        # P2-09: FavoriteTransporter model
        migrations.CreateModel(
            name='FavoriteTransporter',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('client', models.ForeignKey(
                    limit_choices_to={'role': 'CLIENT'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='favorite_transporters',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('transporter', models.ForeignKey(
                    limit_choices_to={'role': 'TRANSPORTER'},
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='favorited_by',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Transporteur favori',
                'verbose_name_plural': 'Transporteurs favoris',
                'ordering': ['-created_at'],
                'unique_together': {('client', 'transporter')},
            },
        ),

        # P2-05: CounterOffer model
        migrations.CreateModel(
            name='CounterOffer',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('proposed_price', models.DecimalField(
                    decimal_places=2, max_digits=10,
                    help_text='New total price proposed by client',
                    validators=[django.core.validators.MinValueValidator(0)],
                )),
                ('message', models.TextField(blank=True, help_text='Optional justification from client')),
                ('status', models.CharField(
                    choices=[('PENDING', 'En attente'), ('ACCEPTED', 'Acceptée'), ('REJECTED', 'Refusée'), ('EXPIRED', 'Expirée')],
                    db_index=True, default='PENDING', max_length=20,
                )),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('offer', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='counter_offers',
                    to='logistics.offer',
                )),
            ],
            options={
                'verbose_name': 'Contre-offre',
                'verbose_name_plural': 'Contre-offres',
                'ordering': ['-created_at'],
            },
        ),
    ]
