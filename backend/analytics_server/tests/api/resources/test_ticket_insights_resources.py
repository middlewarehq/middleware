from unittest.mock import MagicMock

from mhq.api.resources.ticket_insights_resources import adapt_unlinked_prs
from mhq.utils.time import time_now

# CLUSTOX: Jira integration, Phase 4 (§6E) -- the Data Hygiene
# drill-down. See docs/JIRA_INTEGRATION_PROPOSAL.md.


def _pr(**overrides):
    pr = MagicMock()
    pr.id = "pr-1"
    pr.title = "feat(payments): add refund flow"
    pr.url = "https://github.com/org/repo/pull/42"
    pr.head_branch = "feat/refund-flow"
    pr.author = "jordan"
    pr.state_changed_at = time_now()
    for key, value in overrides.items():
        setattr(pr, key, value)
    return pr


class TestAdaptUnlinkedPrs:
    def test_maps_every_field_a_person_needs_to_recognize_the_pr(self):
        pr = _pr()

        [adapted] = adapt_unlinked_prs([pr])

        assert adapted == {
            "id": "pr-1",
            "title": pr.title,
            "url": pr.url,
            "head_branch": pr.head_branch,
            "author": pr.author,
            "merged_at": pr.state_changed_at.isoformat(),
        }

    def test_returns_an_empty_list_for_no_prs(self):
        assert adapt_unlinked_prs([]) == []

    def test_preserves_order(self):
        newer = _pr(id="pr-new")
        older = _pr(id="pr-old")

        adapted = adapt_unlinked_prs([newer, older])

        assert [pr["id"] for pr in adapted] == ["pr-new", "pr-old"]
