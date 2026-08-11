from unittest.mock import MagicMock

from mhq.api.resources.sprint_resources import adapt_sprints
from mhq.utils.time import time_now

# CLUSTOX: Jira integration -- the Sprint rollup chart. See
# docs/JIRA_INTEGRATION_PROPOSAL.md §6D.


def _sprint(**overrides):
    sprint = MagicMock()
    sprint.name = "PZDA Sprint 1"
    sprint.state = "closed"
    sprint.start_date = time_now()
    sprint.end_date = time_now()
    sprint.planned_count = 355
    sprint.completed_count = 272
    for key, value in overrides.items():
        setattr(sprint, key, value)
    return sprint


class TestAdaptSprints:
    def test_maps_every_field(self):
        sprint = _sprint()

        [adapted] = adapt_sprints([sprint])

        assert adapted == {
            "name": "PZDA Sprint 1",
            "state": "closed",
            "start_date": sprint.start_date.isoformat(),
            "end_date": sprint.end_date.isoformat(),
            "planned_count": 355,
            "completed_count": 272,
        }

    def test_a_missing_end_date_adapts_to_none_not_an_error(self):
        [adapted] = adapt_sprints([_sprint(end_date=None)])
        assert adapted["end_date"] is None

    def test_returns_an_empty_list_for_no_sprints(self):
        assert adapt_sprints([]) == []
