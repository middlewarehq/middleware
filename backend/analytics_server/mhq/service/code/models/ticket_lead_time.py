from dataclasses import dataclass


@dataclass
class TicketLeadTimeMetrics:
    """
    CLUSTOX: Jira integration -- the extended Lead Time breakdown's
    "ticket created -> first commit" leading phase (docs/
    JIRA_INTEGRATION_PROPOSAL.md §6A).

    Deliberately its own dataclass, not a new field bolted onto
    LeadTimeMetrics: that one is averaged across *every* merged PR
    (matched to a ticket or not), and mixing a field that's only
    meaningful for a subset into that same weighted average would
    silently understate it -- exactly the population-mismatch bug this
    integration already had to fix once for Ticket Cycle Time. Every
    field here is computed over the *same* matched_pr_count PRs, so the
    two averages are always a fair, like-for-like comparison.
    """

    matched_pr_count: int = 0
    avg_ticket_to_first_commit_seconds: float = 0
    # This is NOT the org-wide lead_time average -- it's the plain
    # (existing, unmodified) lead_time averaged over just this same
    # matched subset, so "extended vs commit-only" compares one
    # population against itself, not two different ones.
    avg_commit_only_lead_time_seconds: float = 0

    @property
    def avg_extended_lead_time_seconds(self) -> float:
        return (
            self.avg_ticket_to_first_commit_seconds
            + self.avg_commit_only_lead_time_seconds
        )
