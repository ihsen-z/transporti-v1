"""
Supprime les pièces d'identité dont les 5 ans de conservation sont écoulés.

Usage :
    python manage.py purge_kyc_documents            # supprime
    python manage.py purge_kyc_documents --dry-run  # compte sans rien supprimer

Lancée chaque jour par `run_scheduled_tasks`. La règle elle-même vit dans
trust/retention.py.
"""
from django.core.management.base import BaseCommand

from trust.retention import KYC_RETENTION_YEARS, purge_cutoff, purge_expired_kyc_documents


class Command(BaseCommand):
    help = "Supprime les pièces KYC expirées depuis plus de 5 ans (fichier et ligne en base)."

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Compte les pièces concernées sans rien supprimer.',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        nombre = purge_expired_kyc_documents(dry_run=dry_run)
        verbe = 'seraient supprimées' if dry_run else 'supprimées'
        self.stdout.write(
            f'{nombre} pièce(s) KYC {verbe} '
            f'(expirées avant le {purge_cutoff():%d/%m/%Y}, '
            f'soit plus de {KYC_RETENTION_YEARS} ans de conservation).'
        )
