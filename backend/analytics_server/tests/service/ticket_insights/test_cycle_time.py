from datetime import datetime, timedelta, timezone

from mhq.service.ticket_insights.cycle_time import compute_average_seconds_by_status
from mhq.store.models.projects import Ticket, TicketState

# CLUSTOX: Jira integration, Phase 4 (§6C). See
# docs/JIRA_INTEGRATION_PROPOSAL.md.

NOW = datetime(2026, 1, 10, tzinfo=timezone.utc)


def _ticket(ticket_id="t1", status="To Do", created_at=None):
    return Ticket(
        id=ticket_id,
        status=status,
        created_at=created_at or datetime(2026, 1, 1, tzinfo=timezone.utc),
    )


def _state(ticket_id, from_status, to_status, changed_at):
    return TicketState(
        ticket_id=ticket_id,
        from_status=from_status,
        to_status=to_status,
        changed_at=changed_at,
    )


def test_a_ticket_with_no_transitions_attributes_its_whole_life_to_its_current_status():
    ticket = _ticket(status="To Do", created_at=datetime(2026, 1, 1, tzinfo=timezone.utc))

    result = compute_average_seconds_by_status([ticket], [], NOW)

    assert result["To Do"].avg_seconds == timedelta(days=9).total_seconds()
    assert result["To Do"].ticket_count == 1


def test_a_single_transition_splits_the_ticket_into_two_segments():
    created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    transitioned_at = datetime(2026, 1, 4, tzinfo=timezone.utc)
    ticket = _ticket(created_at=created_at)
    state = _state("t1", "To Do", "In Progress", transitioned_at)

    result = compute_average_seconds_by_status([ticket], [state], NOW)

    assert result["To Do"].avg_seconds == timedelta(days=3).total_seconds()
    assert result["In Progress"].avg_seconds == timedelta(days=6).total_seconds()


def test_the_last_segment_runs_up_to_now_not_the_last_transition():
    created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    ticket = _ticket(created_at=created_at)
    states = [
        _state("t1", "To Do", "In Progress", datetime(2026, 1, 2, tzinfo=timezone.utc)),
        _state("t1", "In Progress", "Done", datetime(2026, 1, 5, tzinfo=timezone.utc)),
    ]

    result = compute_average_seconds_by_status([ticket], states, NOW)

    assert result["Done"].avg_seconds == timedelta(days=5).total_seconds()


def test_a_first_transition_with_no_from_status_adds_no_phantom_segment():
    # Ticket created directly in its first recorded status -- there's no
    # earlier status to attribute time to.
    created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
    ticket = _ticket(created_at=created_at)
    state = _state("t1", None, "In Progress", datetime(2026, 1, 4, tzinfo=timezone.utc))

    result = compute_average_seconds_by_status([ticket], [state], NOW)

    assert "To Do" not in result
    assert result["In Progress"].avg_seconds == timedelta(days=6).total_seconds()


def test_averages_across_multiple_tickets_in_the_same_status():
    tickets = [
        _ticket("t1", created_at=datetime(2026, 1, 1, tzinfo=timezone.utc)),
        _ticket("t2", created_at=datetime(2026, 1, 5, tzinfo=timezone.utc)),
    ]
    # t1: 9 days in To Do (Jan 1 -> NOW). t2: 5 days in To Do (Jan 5 -> NOW).
    result = compute_average_seconds_by_status(tickets, [], NOW)

    assert result["To Do"].ticket_count == 2
    assert result["To Do"].avg_seconds == timedelta(days=7).total_seconds()


def test_ignores_states_for_a_ticket_not_in_the_given_ticket_list():
    ticket = _ticket("t1", created_at=datetime(2026, 1, 1, tzinfo=timezone.utc))
    # Belongs to a ticket that wasn't passed in (e.g. filtered out by the
    # date-range query) -- must not blow up or get attributed anywhere.
    orphan_state = _state("other-ticket", "To Do", "Done", datetime(2026, 1, 3, tzinfo=timezone.utc))

    result = compute_average_seconds_by_status([ticket], [orphan_state], NOW)

    assert "Done" not in result
    assert result["To Do"].avg_seconds == timedelta(days=9).total_seconds()


def test_discards_a_negative_duration_instead_of_corrupting_the_average():
    # Defensive: a state timestamped before the ticket's own created_at
    # would otherwise produce a negative duration.
    ticket = _ticket("t1", created_at=datetime(2026, 1, 5, tzinfo=timezone.utc))
    bad_state = _state(
        "t1", "To Do", "In Progress", datetime(2026, 1, 1, tzinfo=timezone.utc)
    )

    result = compute_average_seconds_by_status([ticket], [bad_state], NOW)

    assert "To Do" not in result
