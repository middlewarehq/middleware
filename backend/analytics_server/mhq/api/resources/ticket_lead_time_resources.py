from mhq.service.code.models.ticket_lead_time import TicketLeadTimeMetrics


def adapt_ticket_lead_time_metrics(metrics: TicketLeadTimeMetrics) -> dict:
    return {
        "matched_pr_count": metrics.matched_pr_count,
        "avg_ticket_to_first_commit_seconds": round(
            metrics.avg_ticket_to_first_commit_seconds
        ),
        "avg_commit_only_lead_time_seconds": round(
            metrics.avg_commit_only_lead_time_seconds
        ),
        "avg_extended_lead_time_seconds": round(
            metrics.avg_extended_lead_time_seconds
        ),
    }
