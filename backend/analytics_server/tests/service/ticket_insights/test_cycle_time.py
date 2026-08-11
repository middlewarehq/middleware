from datetime import datetime, timedelta, timezone

from mhq.service.ticket_insights.cycle_time import compute_cycle_time_by_project
from mhq.store.models.projects import OrgProject, Ticket, TicketState

# CLUSTOX: Jira integration, Phase 4 (§6C). See
# docs/JIRA_INTEGRATION_PROPOSAL.md.
#
# Callers (ProjectRepoService.get_tickets_with_states_for_projects) only
# ever pass completed (status_category == "Done") tickets in here -- an
# open ticket has no bounded end time, and an earlier version of this
# module measured every ticket up to "now", letting a single item
# sitting untouched in a backlog for months dominate the average. Every
# ticket below therefore has both created_at and updated_at set, the way
# a real completed ticket would.

PROJECT_ID = "proj-1"


def _project(project_id=PROJECT_ID, key="PZDA", name="Project Zero Deposit Africa"):
    return OrgProject(id=project_id, key=key, name=name)


def _ticket(ticket_id="t1", project_id=PROJECT_ID, status="Done", created_at=None, updated_at=None):
    return Ticket(
        id=ticket_id,
        org_project_id=project_id,
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


def _projects_by_id(*projects):
    return {str(p.id): p for p in projects}


class TestComputeCycleTimeByProject:
    def test_a_ticket_with_no_transitions_counts_entirely_as_done(self):
        ticket = _ticket(
            created_at=datetime(2026, 1, 1, tzinfo=timezone.utc),
            updated_at=datetime(2026, 1, 10, tzinfo=timezone.utc),
        )
        project = _project()

        [result] = compute_cycle_time_by_project(
            [ticket], [], _projects_by_id(project)
        )

        assert result.avg_seconds_by_category["Done"] == timedelta(days=9).total_seconds()
        assert result.avg_seconds_by_category["To Do"] == 0
        assert result.avg_seconds_by_category["In Progress"] == 0

    def test_the_three_categories_always_sum_to_the_total(self):
        created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        updated_at = datetime(2026, 1, 20, tzinfo=timezone.utc)
        ticket = _ticket(created_at=created_at, updated_at=updated_at)
        states = [
            _state("t1", "To Do", "In Progress", datetime(2026, 1, 3, tzinfo=timezone.utc)),
            _state("t1", "In Progress", "QA", datetime(2026, 1, 8, tzinfo=timezone.utc)),
            _state("t1", "QA", "Done", datetime(2026, 1, 15, tzinfo=timezone.utc)),
        ]
        project = _project()

        [result] = compute_cycle_time_by_project(
            [ticket], states, _projects_by_id(project)
        )

        assert sum(result.avg_seconds_by_category.values()) == result.avg_total_seconds
        assert result.avg_total_seconds == (updated_at - created_at).total_seconds()

    def test_the_first_segment_is_to_do_and_the_last_is_done_regardless_of_literal_name(
        self,
    ):
        # First status and last status use this project's own literal
        # names ("Backlog", "Shipped") -- the category bucketing is
        # positional, not a name lookup, so it must still work.
        created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        updated_at = datetime(2026, 1, 6, tzinfo=timezone.utc)
        ticket = _ticket(status="Shipped", created_at=created_at, updated_at=updated_at)
        state = _state("t1", "Backlog", "Shipped", datetime(2026, 1, 4, tzinfo=timezone.utc))
        project = _project()

        [result] = compute_cycle_time_by_project(
            [ticket], [state], _projects_by_id(project)
        )

        assert result.avg_seconds_by_category["To Do"] == timedelta(days=3).total_seconds()
        assert result.avg_seconds_by_category["Done"] == timedelta(days=2).total_seconds()
        assert result.avg_seconds_by_category["In Progress"] == 0

    def test_every_middle_segment_becomes_in_progress_regardless_of_how_many_there_are(
        self,
    ):
        created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        updated_at = datetime(2026, 1, 20, tzinfo=timezone.utc)
        ticket = _ticket(created_at=created_at, updated_at=updated_at)
        states = [
            _state("t1", "To Do", "In Progress", datetime(2026, 1, 2, tzinfo=timezone.utc)),
            _state("t1", "In Progress", "QA", datetime(2026, 1, 5, tzinfo=timezone.utc)),
            _state("t1", "QA", "In Testing", datetime(2026, 1, 9, tzinfo=timezone.utc)),
            _state("t1", "In Testing", "In_Review", datetime(2026, 1, 12, tzinfo=timezone.utc)),
            _state("t1", "In_Review", "Done", datetime(2026, 1, 18, tzinfo=timezone.utc)),
        ]
        project = _project()

        [result] = compute_cycle_time_by_project(
            [ticket], states, _projects_by_id(project)
        )

        # In Progress + QA + In Testing + In_Review segments, combined.
        expected_in_progress = (
            timedelta(days=3)
            + timedelta(days=4)
            + timedelta(days=3)
            + timedelta(days=6)
        ).total_seconds()
        assert result.avg_seconds_by_category["In Progress"] == expected_in_progress

    def test_groups_tickets_into_separate_rows_per_project(self):
        project_a = _project("proj-a", key="PAY", name="Payments")
        project_b = _project("proj-b", key="ZDA", name="Zero Deposit Africa")
        ticket_a = _ticket("t1", project_id="proj-a")
        ticket_b = _ticket("t2", project_id="proj-b")

        results = compute_cycle_time_by_project(
            [ticket_a, ticket_b], [], _projects_by_id(project_a, project_b)
        )

        assert {r.project_key for r in results} == {"PAY", "ZDA"}

    def test_sorts_projects_by_key_for_a_stable_order(self):
        project_z = _project("proj-z", key="ZDA")
        project_a = _project("proj-a", key="ABC")
        results = compute_cycle_time_by_project(
            [_ticket("t1", project_id="proj-z"), _ticket("t2", project_id="proj-a")],
            [],
            _projects_by_id(project_z, project_a),
        )

        assert [r.project_key for r in results] == ["ABC", "ZDA"]

    def test_skips_a_ticket_whose_project_is_not_in_the_lookup(self):
        # Defensive: shouldn't happen in practice (the store query already
        # scopes tickets to the team's tracked projects), but must not
        # crash if it did.
        ticket = _ticket(project_id="unknown-project")

        results = compute_cycle_time_by_project([ticket], [], {})

        assert results == []

    def test_averages_multiple_tickets_in_the_same_project(self):
        project = _project()
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

        [result] = compute_cycle_time_by_project(tickets, [], _projects_by_id(project))

        assert result.ticket_count == 2
        assert result.avg_total_seconds == timedelta(days=3).total_seconds()

    def test_discards_a_negative_duration_instead_of_corrupting_the_average(self):
        ticket = _ticket(
            created_at=datetime(2026, 1, 5, tzinfo=timezone.utc),
            updated_at=datetime(2026, 1, 10, tzinfo=timezone.utc),
        )
        bad_state = _state(
            "t1", "To Do", "In Progress", datetime(2026, 1, 1, tzinfo=timezone.utc)
        )
        project = _project()

        [result] = compute_cycle_time_by_project(
            [ticket], [bad_state], _projects_by_id(project)
        )

        # The bad (negative) "To Do" segment is dropped entirely, leaving
        # only the valid "In Progress" -> now segment for this ticket.
        assert result.avg_seconds_by_category["To Do"] == 0

    def test_a_reopened_ticket_puts_its_middle_done_period_into_in_progress(self):
        # Honest, documented limitation of the positional heuristic (see
        # _bucket_by_category's docstring): only the very first and very
        # last segments get special treatment, so a segment that's
        # literally "Done" but sits in the *middle* of the sequence (the
        # ticket was reopened afterward) still lands in "In Progress" --
        # this function has no name->category map to recognize it as
        # Done on its own. Documenting the actual behavior here rather
        # than asserting something this heuristic doesn't actually do.
        created_at = datetime(2026, 1, 1, tzinfo=timezone.utc)
        updated_at = datetime(2026, 1, 20, tzinfo=timezone.utc)
        ticket = _ticket(created_at=created_at, updated_at=updated_at)
        states = [
            _state("t1", "To Do", "In Progress", datetime(2026, 1, 2, tzinfo=timezone.utc)),
            _state("t1", "In Progress", "Done", datetime(2026, 1, 5, tzinfo=timezone.utc)),
            _state("t1", "Done", "In Progress", datetime(2026, 1, 10, tzinfo=timezone.utc)),
            _state("t1", "In Progress", "Done", datetime(2026, 1, 15, tzinfo=timezone.utc)),
        ]
        project = _project()

        [result] = compute_cycle_time_by_project(
            [ticket], states, _projects_by_id(project)
        )

        assert result.ticket_count == 1
        # In Progress (Jan2->Jan5, 3d) + the middle Done period, reopened
        # afterward (Jan5->Jan10, 5d) + the reopened In Progress visit
        # (Jan10->Jan15, 5d) = 13 days, all counted as "In Progress".
        # Only the final Done segment (Jan15->Jan20, 5d) is excluded.
        assert result.avg_seconds_by_category["In Progress"] == timedelta(days=13).total_seconds()
        assert result.avg_seconds_by_category["Done"] == timedelta(days=5).total_seconds()
