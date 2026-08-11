from datetime import datetime, timedelta, timezone

from mhq.service.ticket_insights.cycle_time import (
    compute_average_seconds_by_status,
    compute_average_total_cycle_seconds,
)
from mhq.store.models.projects import Ticket, TicketState

# CLUSTOX: Jira integration, Phase 4 (§6C). See
# docs/JIRA_INTEGRATION_PROPOSAL.md.
#
# Callers (ProjectRepoService.get_tickets_with_states_for_projects) only
# ever pass completed (status_category == "Done") tickets in here -- an
# open ticket has no bounded end time, and an earlier version of this
# function that measured every ticket up to "now" let a single item
# sitting untouched in a backlog for months dominate the average. Every
# ticket below therefore has both created_at and updated_at set, the way
# a real completed ticket would.


def _ticket(ticket_id="t1", status="Done", created_at=None, updated_at=None):
    return Ticket(
        id=ticket_id,
        status=status,
        created_at=created_at or datetime(2026, 1, 1, tzinfo=timezone.utc),
        updated_at=updated_at or datetime(2026, 1, 10, tzinfo=timezone.utc),
    )


def _state(ticket_id, from_status, to_status, changed_at):
    return TicketState(
        ticket_id=ticket_id,
        from_status=from_status,
        to_status=to_status,
        changed_at=changed_at,
    )


class TestComputeAverageSecondsByStatus:
    def test_a_ticket_with_no_transitions_attributes_its_whole_life_to_its_status(self):
        ticket = _ticket(
            status="Done",
            created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
            updated_at=datetime(2026, 1, 10, tzinfo=timezone.utc),
        )

        result = compute_average_seconds_by_status([ticket], [])

        assert result["Done"].avg_seconds == timedelta(days=9).total_seconds()
        assert result["Done"].ticket_count == 1

    def test_a_single_transition_splits_the_ticket_into_two_segments(self):
        created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        transitioned_at = datetime(2026, 1, 4, tzinfo=timezone.utc)
        ticket = _ticket(
            created_at=created_at, updated_at=datetime(2026, 1, 10, tzinfo=timezone.utc)
        )
        state = _state("t1", "To Do", "Done", transitioned_at)

        result = compute_average_seconds_by_status([ticket], [state])

        assert result["To Do"].avg_seconds == timedelta(days=3).total_seconds()
        assert result["Done"].avg_seconds == timedelta(days=6).total_seconds()

    def test_the_last_segment_ends_at_the_tickets_own_updated_at_not_live_time(self):
        # This is the actual bug this rewrite fixes: a ticket that
        # finished long ago must not have its final segment stretched out
        # to "now" just because the report is run today.
        created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        updated_at = datetime(2026, 1, 5, tzinfo=timezone.utc)
        ticket = _ticket(created_at=created_at, updated_at=updated_at)
        state = _state("t1", "In Progress", "Done", datetime(2026, 1, 3, tzinfo=timezone.utc))

        result = compute_average_seconds_by_status([ticket], [state])

        assert result["Done"].avg_seconds == timedelta(days=2).total_seconds()

    def test_a_first_transition_with_no_from_status_adds_no_phantom_segment(self):
        created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        ticket = _ticket(created_at=created_at, updated_at=datetime(2026, 1, 10, tzinfo=timezone.utc))
        state = _state("t1", None, "In Progress", datetime(2026, 1, 4, tzinfo=timezone.utc))

        result = compute_average_seconds_by_status([ticket], [state])

        assert "To Do" not in result

    def test_averages_across_multiple_tickets_in_the_same_status(self):
        tickets = [
            _ticket(
                "t1",
                created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
                updated_at=datetime(2026, 1, 10, tzinfo=timezone.utc),
            ),
            _ticket(
                "t2",
                created_at=datetime(2026, 1, 5, tzinfo=timezone.utc),
                updated_at=datetime(2026, 1, 10, tzinfo=timezone.utc),
            ),
        ]
        result = compute_average_seconds_by_status(tickets, [])

        assert result["Done"].ticket_count == 2
        assert result["Done"].avg_seconds == timedelta(days=7).total_seconds()

    def test_ignores_states_for_a_ticket_not_in_the_given_ticket_list(self):
        ticket = _ticket(
            "t1",
            created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
            updated_at=datetime(2026, 1, 10, tzinfo=timezone.utc),
        )
        orphan_state = _state(
            "other-ticket", "To Do", "Done", datetime(2026, 1, 3, tzinfo=timezone.utc)
        )

        result = compute_average_seconds_by_status([ticket], [orphan_state])

        assert "To Do" not in result
        assert result["Done"].avg_seconds == timedelta(days=9).total_seconds()

    def test_a_ticket_that_revisits_the_same_status_twice_counts_once_with_combined_duration(
        self,
    ):
        # Reopened: Done -> To Do -> Done again. "To Do" should show up
        # as ONE ticket with the sum of both visits, not two samples --
        # otherwise a single frequently-reopened ticket silently
        # outweighs every ticket that only passed through once, and
        # ticket_count stops meaning "how many tickets".
        created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        updated_at = datetime(2026, 1, 20, tzinfo=timezone.utc)
        ticket = _ticket(created_at=created_at, updated_at=updated_at)
        states = [
            _state("t1", "To Do", "Done", datetime(2026, 1, 3, tzinfo=timezone.utc)),
            _state("t1", "Done", "To Do", datetime(2026, 1, 10, tzinfo=timezone.utc)),
            _state("t1", "To Do", "Done", datetime(2026, 1, 15, tzinfo=timezone.utc)),
        ]

        result = compute_average_seconds_by_status([ticket], states)

        # First visit: Jan 1 -> Jan 3 (2 days). Second visit: Jan 10 -> Jan
        # 15 (5 days). Combined: 7 days, as a single ticket.
        assert result["To Do"].ticket_count == 1
        assert result["To Do"].avg_seconds == timedelta(days=7).total_seconds()

    def test_discards_a_negative_duration_instead_of_corrupting_the_average(self):
        ticket = _ticket(
            "t1",
            created_at=datetime(2026, 1, 5, tzinfo=timezone.utc),
            updated_at=datetime(2026, 1, 10, tzinfo=timezone.utc),
        )
        bad_state = _state(
            "t1", "To Do", "In Progress", datetime(2026, 1, 1, tzinfo=timezone.utc)
        )

        result = compute_average_seconds_by_status([ticket], [bad_state])

        assert "To Do" not in result


class TestComputeAverageTotalCycleSeconds:
    def test_averages_creation_to_last_update_across_tickets(self):
        tickets = [
            _ticket(
                "t1",
                created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
                updated_at=datetime(2026, 1, 5, tzinfo=timezone.utc),
            ),
            _ticket(
                "t2",
                created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
                updated_at=datetime(2026, 1, 3, tzinfo=timezone.utc),
            ),
        ]

        result = compute_average_total_cycle_seconds(tickets)

        assert result.ticket_count == 2
        assert result.avg_seconds == timedelta(days=3).total_seconds()

    def test_returns_none_for_an_empty_ticket_list(self):
        assert compute_average_total_cycle_seconds([]) is None
