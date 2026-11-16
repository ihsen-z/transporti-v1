"""
Remet Conversation.participants en phase avec les participants ACTUELS.

Avant ce correctif, la liste n'était jamais nettoyée : un transporteur (ou le
client d'un trajet retour) parti après une annulation y restait. Le code ne
s'y fie plus pour l'accès, mais l'écran de liste en tire encore le nom de
l'autre partie : on la recalcule une fois pour les conversations existantes.

Même règle que logistics/participants.get_current_participants, réécrite
avec les modèles historiques (une migration ne doit pas importer le code
applicatif, qui évolue).
"""
from django.db import migrations


def resync(apps, schema_editor):
    Conversation = apps.get_model('messaging', 'Conversation')
    Offer = apps.get_model('logistics', 'Offer')
    ReturnTripRequest = apps.get_model('logistics', 'ReturnTripRequest')

    for conversation in Conversation.objects.select_related('job').iterator():
        job = conversation.job
        ids = []

        # Transporteur : offre ACCEPTED, sinon le propriétaire d'un trajet retour.
        offer = Offer.objects.filter(job=job, status='ACCEPTED').first()
        if offer is not None:
            ids.append(offer.transporter_id)
        elif job.is_return_trip:
            ids.append(job.owner_id)

        # Client : demande ACCEPTED sur un trajet retour, sinon le propriétaire.
        if job.is_return_trip:
            accepted = ReturnTripRequest.objects.filter(job=job, status='ACCEPTED').first()
            if accepted is not None:
                ids.append(accepted.client_id)
        else:
            ids.append(job.owner_id)

        conversation.participants.set(sorted(set(ids)))


class Migration(migrations.Migration):

    dependencies = [
        ('messaging', '0001_messaging_models'),
        ('logistics', '0020_adresses_facultatives'),
    ]

    operations = [
        migrations.RunPython(resync, migrations.RunPython.noop),
    ]
