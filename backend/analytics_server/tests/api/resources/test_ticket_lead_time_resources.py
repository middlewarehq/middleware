from mhq.api.resources.ticket_lead_time_resources import (
    adapt_ticket_lead_time_metrics,
)
from mhq.service.code.models.ticket_lead_time import TicketLeadTimeMetrics

# CLUSTOX: Jira integration -- the extended Lead Time breakdown. See
# docs/JIRA_INTEGRATION_PROPOSAL.md §6A.


class TestAdaptTicketLeadTimeMetrics:
    def test_maps_every_field_and_derives_the_extended_total(self):
        metrics = TicketLeadTimeMetrics(
            matched_pr_count=5,
            avg_ticket_to_first_commit_seconds=86400.4,
            avg_commit_only_lead_time_seconds=3600.6,
        )

        adapted = adapt_ticket_lead_time_metrics(metrics)

        assert adapted == {
            "matched_pr_count": 5,
            "avg_ticket_to_first_commit_seconds": 86400,
            "avg_commit_only_lead_time_seconds": 3601,
            "avg_extended_lead_time_seconds": 90001,
        }

    def test_zeroed_metrics_adapt_to_all_zeros(self):
        assert adapt_ticket_lead_time_metrics(TicketLeadTimeMetrics()) == {
            "matched_pr_count": 0,
            "avg_ticket_to_first_commit_seconds": 0,
            "avg_commit_only_lead_time_seconds": 0,
            "avg_extended_lead_time_seconds": 0,
        }
