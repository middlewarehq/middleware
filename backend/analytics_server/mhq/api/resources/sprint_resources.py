from typing import Dict, List

from mhq.store.models.projects import Sprint


def adapt_sprints(sprints: List[Sprint]) -> List[Dict]:
    return [
        {
            "name": sprint.name,
            "state": sprint.state,
            "start_date": sprint.start_date.isoformat() if sprint.start_date else None,
            "end_date": sprint.end_date.isoformat() if sprint.end_date else None,
            "planned_count": sprint.planned_count,
            "completed_count": sprint.completed_count,
        }
        for sprint in sprints
    ]
