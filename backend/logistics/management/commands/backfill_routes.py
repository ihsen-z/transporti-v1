"""
Management command to backfill route geometry on jobs created before routing
existed.

    python manage.py backfill_routes --dry-run
    python manage.py backfill_routes --limit 50

Idempotent: only touches jobs whose route_polyline is still empty, so it can be
re-run safely after a partial pass (routing is a network call — some will fail).

Each job costs one request to the router, so --limit exists to spread the load
rather than hammer the service in one go.
"""
import logging
import time

from django.core.management.base import BaseCommand
from logistics.models import TransportJob
from logistics.routing import resolve_route_for_job

logger = logging.getLogger('transporti')


class Command(BaseCommand):
    help = 'Compute route_polyline and real distance_km for jobs missing them.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be routed without writing anything.',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=100,
            help='Maximum number of jobs to process (default 100).',
        )
        parser.add_argument(
            '--sleep',
            type=float,
            default=0.2,
            help='Seconds to wait between router calls (default 0.2).',
        )
        parser.add_argument(
            '--pickup',
            help='Only jobs departing from this governorate.',
        )
        parser.add_argument(
            '--dropoff',
            help='Only jobs arriving at this governorate.',
        )
        parser.add_argument(
            '--timeout',
            type=float,
            default=20.0,
            help='Router timeout in seconds (default 20 — a batch can be more '
                 'patient than an interactive publish).',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        limit = options['limit']
        pause = options['sleep']

        queryset = TransportJob.objects.filter(route_polyline='')
        if options.get('pickup'):
            queryset = queryset.filter(pickup_governorate__iexact=options['pickup'])
        if options.get('dropoff'):
            queryset = queryset.filter(dropoff_governorate__iexact=options['dropoff'])

        total = queryset.count()
        jobs = list(queryset.order_by('id')[:limit])

        if not jobs:
            self.stdout.write(self.style.SUCCESS('No job needs a route.'))
            return

        self.stdout.write(f'{total} job(s) without a route, processing {len(jobs)}.')

        # Le routeur renvoie le meme trace pour un meme couple de gouvernorats,
        # A CONDITION que le trace soit calcule depuis les centroides. On met en
        # cache par corridor pour ne pas payer 50 appels identiques.
        cache = {}
        appels = 0  # appels reellement passes au routeur, cache deduit
        updated = 0
        failed = 0

        for job in jobs:
            corridor = (
                (job.pickup_governorate or '').strip().lower(),
                (job.dropoff_governorate or '').strip().lower(),
            )

            # MUTUALISER SERAIT FAUX pour un job qui porte des coordonnees
            # precises : `resolve_route_for_job` part des coordonnees quand il
            # en a, et ne retombe sur les centroides du corridor qu'a defaut.
            # Deux jobs du meme corridor -- ou de corridor VIDE, comme les jobs
            # du seed connus par leur seul point GPS -- n'ont alors pas le meme
            # trace. Sans cette distinction, le premier job route imposait sa
            # polyligne et sa distance a tous les suivants, sans aucun signal.
            routable_au_point = None not in (
                job.pickup_lat, job.pickup_lng, job.dropoff_lat, job.dropoff_lng,
            )
            cle = None if routable_au_point else corridor

            if cle is not None and cle in cache:
                route = cache[cle]
            else:
                route = resolve_route_for_job(
                    job.pickup_lat, job.pickup_lng,
                    job.dropoff_lat, job.dropoff_lng,
                    job.pickup_governorate, job.dropoff_governorate,
                    timeout=options['timeout'],
                )
                appels += 1
                if cle is not None:
                    cache[cle] = route
                if pause > 0:
                    time.sleep(pause)

            if route is None:
                failed += 1
                self.stdout.write(self.style.WARNING(
                    f'  job {job.id} ({corridor[0]} -> {corridor[1]}): routage impossible'
                ))
                continue

            self.stdout.write(
                f'  job {job.id} ({corridor[0]} -> {corridor[1]}): '
                f'{job.distance_km} km -> {route.distance_km} km'
            )

            if not dry_run:
                job.route_polyline = route.polyline
                job.distance_km = route.distance_km
                job.save(update_fields=['route_polyline', 'distance_km', 'updated_at'])
            updated += 1

        prefix = '[dry-run] ' if dry_run else ''
        self.stdout.write(self.style.SUCCESS(
            f'{prefix}{updated} job(s) routed, {failed} failed, '
            f'{appels} router call(s) for {len(jobs)} job(s).'
        ))
