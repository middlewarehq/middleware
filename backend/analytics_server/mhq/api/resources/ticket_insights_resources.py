from typing import Dict


def adapt_ticket_insights(insights: Dict) -> Dict:
    return {
        "cycle_time_by_status": [
            {
                "status": status,
                "avg_seconds": round(cycle_time.avg_seconds),
                "ticket_count": cycle_time.ticket_count,
            }
            for status, cycle_time in insights["cycle_time_by_status"].items()
        ],
        "ticket_count": insights["ticket_count"],
        "prs_without_ticket_count": insights["prs_without_ticket_count"],
    }
