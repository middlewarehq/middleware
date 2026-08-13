from typing import List

from mhq.service.code.lead_time import LeadTimeService, get_lead_time_service
from mhq.service.code.models.lead_time import LeadTimeMetrics
from mhq.service.code.models.ticket_lead_time import TicketLeadTimeMetrics
from mhq.store.models.core import Team
from mhq.store.repos.code import CodeRepoService
from mhq.store.repos.ticket_matching import TicketMatchingRepoService
from mhq.utils.time import Interval


class TicketLeadTimeService:
    """
    CLUSTOX: Jira integration -- the extended Lead Time breakdown's
    "ticket created -> first commit" leading phase (docs/
    JIRA_INTEGRATION_PROPOSAL.md §6A).

    Deliberately additive alongside LeadTimeService, not a change to it:
    every existing method there (and the plain, org-wide "lead_time" DORA
    card that depends on them) is untouched. This composes
    get_team_pr_lead_time_metrics' per-PR list with the ticket-matching
    and commit stores to build a second, separate average scoped to only
    the PRs that actually have a matched ticket -- see
    TicketLeadTimeMetrics for why that scoping matters.
    """

    def __init__(
        self,
        lead_time_service: LeadTimeService,
        code_repo_service: CodeRepoService,
        ticket_matching_repo_service: TicketMatchingRepoService,
    ):
        self._lead_time_service = lead_time_service
        self._code_repo_service = code_repo_service
        self._ticket_matching_repo_service = ticket_matching_repo_service

    def get_team_ticket_lead_time_metrics(
        self, team: Team, interval: Interval
    ) -> TicketLeadTimeMetrics:
        pr_metrics = self._lead_time_service.get_team_pr_lead_time_metrics(
            team, interval
        )
        if not pr_metrics:
            return TicketLeadTimeMetrics()

        pr_ids = [str(metric.pr_id) for metric in pr_metrics]
        ticket_created_at_by_pr = (
            self._ticket_matching_repo_service.get_ticket_created_at_by_pr_ids(pr_ids)
        )
        matched_metrics = [
            metric
            for metric in pr_metrics
            if str(metric.pr_id) in ticket_created_at_by_pr
        ]
        if not matched_metrics:
            return TicketLeadTimeMetrics()

        first_commit_at_by_pr = self._code_repo_service.get_first_commit_at_by_pr_ids(
            [str(metric.pr_id) for metric in matched_metrics]
        )

        return self._average_over_matched_prs(
            matched_metrics, ticket_created_at_by_pr, first_commit_at_by_pr
        )

    def _average_over_matched_prs(
        self,
        matched_metrics: List[LeadTimeMetrics],
        ticket_created_at_by_pr: dict,
        first_commit_at_by_pr: dict,
    ) -> TicketLeadTimeMetrics:
        ticket_to_commit_durations = []
        commit_only_lead_times = []

        for metric in matched_metrics:
            pr_id = str(metric.pr_id)
            first_commit_at = first_commit_at_by_pr.get(pr_id)
            ticket_created_at = ticket_created_at_by_pr.get(pr_id)
            # A PR matched to a ticket but with no PullRequestCommit row
            # synced -- can't anchor a real "first commit" timestamp, so
            # this PR is excluded rather than guessed.
            if not first_commit_at or not ticket_created_at:
                continue

            duration = (first_commit_at - ticket_created_at).total_seconds()
            # A ticket created *after* the first commit (filed
            # retroactively, or the regex matched a ticket key that was
            # only created later) isn't a real "idea to commit" span --
            # excluded rather than shown as a negative duration.
            if duration < 0:
                continue

            ticket_to_commit_durations.append(duration)
            commit_only_lead_times.append(metric.lead_time)

        matched_pr_count = len(ticket_to_commit_durations)
        if not matched_pr_count:
            return TicketLeadTimeMetrics()

        return TicketLeadTimeMetrics(
            matched_pr_count=matched_pr_count,
            avg_ticket_to_first_commit_seconds=(
                sum(ticket_to_commit_durations) / matched_pr_count
            ),
            avg_commit_only_lead_time_seconds=(
                sum(commit_only_lead_times) / matched_pr_count
            ),
        )


def get_ticket_lead_time_service() -> TicketLeadTimeService:
    return TicketLeadTimeService(
        get_lead_time_service(), CodeRepoService(), TicketMatchingRepoService()
    )
