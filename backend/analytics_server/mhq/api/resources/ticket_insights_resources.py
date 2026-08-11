from typing import Dict


def adapt_ticket_insights(insights: Dict) -> Dict:
    return {
        "cycle_time_by_project": [
            {
                "project_key": project.project_key,
                "project_name": project.project_name,
                "ticket_count": project.ticket_count,
                "avg_total_seconds": round(project.avg_total_seconds),
                "avg_seconds_by_category": {
                    category: round(seconds)
                    for category, seconds in project.avg_seconds_by_category.items()
                },
            }
            for project in insights["cycle_time_by_project"]
        ],
        "prs_without_ticket_count": insights["prs_without_ticket_count"],
    }
