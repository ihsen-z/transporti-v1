"""
Single source of truth for "who takes part in this job".

Why this module exists
----------------------
Transporti has TWO channels that place the client and the transporter in
opposite roles:

* Classic channel  — the CLIENT publishes the job, so ``job.owner`` is the
  client, and the transporter is the holder of the ACCEPTED offer.
* Return trip (the pivot) — the TRANSPORTER publishes the empty return, so
  ``job.owner`` is the *transporter*. The client is only linked to the job
  through a ``ReturnTripRequest`` with status ACCEPTED.

Before this module, four places re-implemented the rule as "owner OR accepted
offer transporter", which silently excluded the client of every return trip:
messaging, disputes, reviews and the job detail view each returned 403/400 to
a client whose request had just been accepted. Payments had the same blind
spot expressed as ``owner=request.user`` filters.

Any new code that needs to know whether a user takes part in a job MUST use
these helpers rather than re-deriving the rule.
"""

from __future__ import annotations

from typing import Optional


def get_job_transporter(job) -> Optional[object]:
    """
    Return the transporter carrying out this job, or None if not assigned yet.

    Works for both channels: on a return trip the acceptance path creates an
    ACCEPTED offer whose transporter is the job owner, so the offer lookup
    covers it. The ``is_return_trip`` fallback handles the window before any
    request has been accepted.
    """
    offer = (
        job.offers.filter(status='ACCEPTED')
        .select_related('transporter')
        .first()
    )
    if offer is not None:
        return offer.transporter
    if getattr(job, 'is_return_trip', False):
        return job.owner
    return None


def get_job_client(job) -> Optional[object]:
    """
    Return the client of this job — the party who owes the money.

    Classic channel: the job owner.
    Return trip: the client of the ACCEPTED request, or None while the
    transporter has not accepted anyone yet.
    """
    if getattr(job, 'is_return_trip', False):
        accepted = (
            job.trip_requests.filter(status='ACCEPTED')
            .select_related('client')
            .first()
        )
        return accepted.client if accepted is not None else None
    return job.owner


def get_paying_client(job) -> Optional[object]:
    """
    Alias of :func:`get_job_client`, used by the payment views where the intent
    is specifically "who is allowed to pay / confirm / see the escrow".
    """
    return get_job_client(job)


def is_job_participant(user, job) -> bool:
    """
    True if ``user`` is either side of this job's transaction.

    This is the strict rule: it grants access only to the assigned transporter
    and to the client who is actually engaged (owner on the classic channel,
    accepted requester on a return trip). A client whose request is still
    pending — or was rejected — is NOT a participant.
    """
    if user is None or not getattr(user, 'id', None):
        return False

    transporter = get_job_transporter(job)
    if transporter is not None and transporter.id == user.id:
        return True

    client = get_job_client(job)
    return client is not None and client.id == user.id


def is_conversation_participant(user, job) -> bool:
    """
    Broader rule used by the messaging layer only.

    On top of the strict rule, it honours an explicit membership in
    ``Conversation.participants`` — the acceptance path adds the client there
    directly (logistics/views/trip_requests.py), and a moderator may add
    someone for support reasons. Keeping this as a distinct function avoids
    widening the rule that governs money, reviews and disputes.
    """
    if is_job_participant(user, job):
        return True

    conversation = getattr(job, 'conversation', None)
    if conversation is None:
        return False
    return conversation.participants.filter(id=user.id).exists()
