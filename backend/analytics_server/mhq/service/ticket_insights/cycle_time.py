from collections import defaultdict
from dataclasses import dataclass, field
from typing import Dict, List, Tuple

from mhq.store.models.projects import OrgProject, Ticket, TicketState

# Jira Cloud's 3 status categories are fixed platform-wide, not
# customizable per workflow -- unlike individual status names, which
# vary per team (see docs/JIRA_INTEGRATION_PROPOSAL.md's design
# reference: this groups by these 3 categories, one segmented bar per
# project, not a flat list of a team's own literal status names).
CATEGORIES = ("To Do", "In Progress", "Done")


@dataclass
class ProjectCycleTime:
    project_key: str
    project_name: str
    ticket_count: int
    avg_total_seconds: float
    avg_seconds_by_category: Dict[str, float] = field(default_factory=dict)


def compute_cycle_time_by_project(
    tickets: List[Ticket],
    ticket_states: List[TicketState],
    projects_by_id: Dict[str, OrgProject],
) -> List[ProjectCycleTime]:
    """
    Average cycle time per project, each broken into the 3 status
    categories -- docs/JIRA_INTEGRATION_PROPOSAL.md §6C.

    Callers must only pass tickets that have actually reached a
    "Done"-category status (ProjectRepoService.get_tickets_with_states_
    for_projects already filters for this). A ticket still open has no
    bounded end time -- an early version of this measured every ticket up
    to "now", and a single item sitting untouched in a backlog for
    months dominated the average with a duration that had nothing to do
    with how long finished work actually took. Every segment's end
    boundary here is a ticket's own last recorded activity, never live
    time.

    Every category average is computed over the *same* ticket set (a
    ticket that never had an "In Progress" segment counts as 0 seconds
    there, not excluded), so the 3 category averages always sum to
    avg_total_seconds -- needed for a stacked bar whose segment widths
    are supposed to add up to the whole bar.
    """
    states_by_ticket: Dict[str, List[TicketState]] = defaultdict(list)
    for state in ticket_states:
        states_by_ticket[str(state.ticket_id)].append(state)

    tickets_by_project: Dict[str, List[Ticket]] = defaultdict(list)
    for ticket in tickets:
        tickets_by_project[str(ticket.org_project_id)].append(ticket)

    results: List[ProjectCycleTime] = []
    for project_id, project_tickets in tickets_by_project.items():
        project = projects_by_id.get(project_id)
        if not project:
            continue

        per_ticket_totals: List[float] = []
        category_sums = {category: 0.0 for category in CATEGORIES}

        for ticket in project_tickets:
            states = sorted(
                states_by_ticket.get(str(ticket.id), []), key=lambda s: s.changed_at
            )
            segments = [
                (status, seconds)
                for status, seconds in _status_segments(ticket, states)
                if seconds >= 0
            ]
            if not segments:
                continue

            for category, seconds in _bucket_by_category(segments).items():
                category_sums[category] += seconds
            per_ticket_totals.append(sum(seconds for _, seconds in segments))

        ticket_count = len(per_ticket_totals)
        if not ticket_count:
            continue

        results.append(
            ProjectCycleTime(
                project_key=project.key,
                project_name=project.name,
                ticket_count=ticket_count,
                avg_total_seconds=sum(per_ticket_totals) / ticket_count,
                avg_seconds_by_category={
                    category: category_sums[category] / ticket_count
                    for category in CATEGORIES
                },
            )
        )

    return sorted(results, key=lambda p: p.project_key)


def _bucket_by_category(segments: List[Tuple[str, float]]) -> Dict[str, float]:
    """
    First segment -> To Do (the status a ticket is created in), last
    segment -> Done (guaranteed -- callers only pass completed tickets,
    so a ticket's final recorded status is always Done-category),
    everything in between -> In Progress.

    Positional, not a literal-status-name lookup: the changelog data this
    integration syncs only has the literal from/to status strings, not
    each one's category (that would need a separate call to Jira's
    /rest/api/3/status to build a name -> category map, which nothing
    else needs yet). Every real Jira workflow's first status is To Do
    category and last is Done category by definition, so position is a
    reliable enough proxy without that extra call.

    Known, accepted limitation: only the very first and very last
    segments get special treatment. A ticket reopened *after* reaching
    Done (Done -> In Progress -> Done again) has its middle Done period
    counted as "In Progress", since this function has no way to
    recognize a middle segment as Done on its own -- see
    test_a_reopened_ticket_puts_its_middle_done_period_into_in_progress
    for the documented, deliberate behavior this produces.
    """
    if len(segments) == 1:
        return {"Done": segments[0][1]}

    result: Dict[str, float] = defaultdict(float)
    result["To Do"] += segments[0][1]
    for _, seconds in segments[1:-1]:
        result["In Progress"] += seconds
    result["Done"] += segments[-1][1]
    return dict(result)


def _status_segments(ticket: Ticket, states: List[TicketState]):
    """
    (status, seconds-spent-in-it) for every segment of a completed
    ticket's life, from creation to its own last recorded activity.
    """
    if not states:
        # Never transitioned since sync started tracking it -- it's spent
        # its whole observed life (creation to last update) in this one
        # status.
        return [
            (ticket.status, (ticket.updated_at - ticket.created_at).total_seconds())
        ]

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
        segments.append(
            (state.to_status, (segment_end - state.changed_at).total_seconds())
        )

    return segments
