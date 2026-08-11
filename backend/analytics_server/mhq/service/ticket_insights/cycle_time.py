from collections import defaultdict
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, List

from mhq.store.models.projects import Ticket, TicketState


@dataclass
class StatusCycleTime:
    avg_seconds: float
    ticket_count: int


def compute_average_seconds_by_status(
    tickets: List[Ticket], ticket_states: List[TicketState], now: datetime
) -> Dict[str, StatusCycleTime]:
    """
    Average time tickets spend in each status, across the given tickets
    -- docs/JIRA_INTEGRATION_PROPOSAL.md §6C. Grouped by the literal
    status name, not Jira's 3-bucket status category: a real team
    already knows their own workflow's status names, and a bucket alone
    would hide the actual bottleneck ("stuck in Code Review" reads very
    differently from a generic "In Progress").

    `now` is passed in, not read internally, so this stays a pure
    function callers can test without freezing the clock.
    """
    states_by_ticket: Dict[str, List[TicketState]] = defaultdict(list)
    for state in ticket_states:
        states_by_ticket[str(state.ticket_id)].append(state)

    durations_by_status: Dict[str, List[float]] = defaultdict(list)

    for ticket in tickets:
        states = sorted(
            states_by_ticket.get(str(ticket.id), []), key=lambda s: s.changed_at
        )
        for status, seconds in _status_segments(ticket, states, now):
            if seconds >= 0:
                durations_by_status[status].append(seconds)

    return {
        status: StatusCycleTime(
            avg_seconds=sum(durations) / len(durations),
            ticket_count=len(durations),
        )
        for status, durations in durations_by_status.items()
    }


def _status_segments(ticket: Ticket, states: List[TicketState], now: datetime):
    """
    (status, seconds-spent-in-it) for every segment of a ticket's life,
    from creation to now.
    """
    if not states:
        # Never transitioned since sync started tracking it -- it's been
        # in its current status since creation.
        return [(ticket.status, (now - ticket.created_at).total_seconds())]

    segments = []
    # Jira's changelog is complete back to creation, so the first
    # transition's from_status is the status the ticket was created in
    # -- this segment is real, recoverable data, not a guess.
    if states[0].from_status:
        segments.append(
            (
                states[0].from_status,
                (states[0].changed_at - ticket.created_at).total_seconds(),
            )
        )

    for i, state in enumerate(states):
        segment_end = states[i + 1].changed_at if i + 1 < len(states) else now
        segments.append((state.to_status, (segment_end - state.changed_at).total_seconds()))

    return segments
