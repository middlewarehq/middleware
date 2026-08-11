from collections import defaultdict
from dataclasses import dataclass
from typing import Dict, List, Optional

from mhq.store.models.projects import Ticket, TicketState


@dataclass
class StatusCycleTime:
    avg_seconds: float
    ticket_count: int


def compute_average_seconds_by_status(
    tickets: List[Ticket], ticket_states: List[TicketState]
) -> Dict[str, StatusCycleTime]:
    """
    Average time *completed* tickets spent in each status, across the
    given tickets -- docs/JIRA_INTEGRATION_PROPOSAL.md §6C.

    Callers must only pass tickets that have actually reached a
    "Done"-category status (ProjectRepoService.get_tickets_with_states_
    for_projects already filters for this). A ticket still open has no
    bounded end time -- an early version of this function measured every
    ticket up to "now", and a single item that had been sitting untouched
    in the backlog for months dominated the "To Do" average with a
    duration that had nothing to do with how long finished work actually
    took. Every segment's end boundary here is a ticket's own last
    recorded activity (updated_at) or its next real transition, never
    live time -- this keeps the function pure (no wall-clock dependency)
    and keeps every duration bounded by data Jira actually recorded.

    Grouped by the literal status name, not Jira's 3-bucket status
    category: a real team already knows their own workflow's status
    names, and a bucket alone would hide the actual bottleneck ("stuck in
    Code Review" reads very differently from a generic "In Progress").

    A ticket that revisits the same status more than once (e.g. reopened
    from Done back to To Do, then redone) contributes one *combined*
    duration for that status, not one sample per visit -- otherwise
    ticket_count stops meaning "how many tickets", and a single
    frequently-reopened ticket would silently outweigh every ticket that
    only passed through once.
    """
    states_by_ticket: Dict[str, List[TicketState]] = defaultdict(list)
    for state in ticket_states:
        states_by_ticket[str(state.ticket_id)].append(state)

    seconds_by_ticket_and_status: Dict[str, Dict[str, float]] = defaultdict(
        lambda: defaultdict(float)
    )

    for ticket in tickets:
        states = sorted(
            states_by_ticket.get(str(ticket.id), []), key=lambda s: s.changed_at
        )
        for status, seconds in _status_segments(ticket, states):
            if seconds >= 0:
                seconds_by_ticket_and_status[str(ticket.id)][status] += seconds

    durations_by_status: Dict[str, List[float]] = defaultdict(list)
    for status_seconds in seconds_by_ticket_and_status.values():
        for status, seconds in status_seconds.items():
            durations_by_status[status].append(seconds)

    return {
        status: StatusCycleTime(
            avg_seconds=sum(durations) / len(durations),
            ticket_count=len(durations),
        )
        for status, durations in durations_by_status.items()
    }


def compute_average_total_cycle_seconds(
    tickets: List[Ticket],
) -> Optional[StatusCycleTime]:
    """
    Average creation-to-last-update time across the given (completed)
    tickets -- the single "N days avg" headline figure the per-status
    breakdown above adds up to. A separate function, not folded into the
    one above, so each has exactly one job: this reads only
    Ticket.created_at/updated_at and doesn't care about status history
    at all.
    """
    if not tickets:
        return None

    durations = [
        (ticket.updated_at - ticket.created_at).total_seconds() for ticket in tickets
    ]
    durations = [seconds for seconds in durations if seconds >= 0]
    if not durations:
        return None

    return StatusCycleTime(
        avg_seconds=sum(durations) / len(durations),
        ticket_count=len(durations),
    )


def _status_segments(ticket: Ticket, states: List[TicketState]):
    """
    (status, seconds-spent-in-it) for every segment of a completed
    ticket's life, from creation to its own last recorded activity.
    """
    if not states:
        # Never transitioned since sync started tracking it -- it's spent
        # its whole observed life (creation to last update) in this one
        # status.
        return [(ticket.status, (ticket.updated_at - ticket.created_at).total_seconds())]

    segments = []
    # Jira's changelog is complete back to creation, so the first
    # transition's from_status is the status the ticket was created in --
    # this segment is real, recoverable data, not a guess.
    if states[0].from_status:
        segments.append(
            (
                states[0].from_status,
                (states[0].changed_at - ticket.created_at).total_seconds(),
            )
        )

    for i, state in enumerate(states):
        segment_end = (
            states[i + 1].changed_at if i + 1 < len(states) else ticket.updated_at
        )
        segments.append((state.to_status, (segment_end - state.changed_at).total_seconds()))

    return segments
