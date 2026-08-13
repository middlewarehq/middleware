from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional

from mhq.utils.time import dt_from_iso_time_string


@dataclass
class JiraChangelogEntry:
    """
    One Jira changelog "history" entry that includes a status change.
    A single history entry can bundle several field changes at once (e.g.
    status + assignee edited together) -- this only exists for entries
    that actually changed `status`; entries with no status item are
    filtered out by the caller (see JiraIssue.__init__) rather than kept
    around with a meaningless to_status.
    """

    idempotency_key: str
    from_status: Optional[str]
    to_status: Optional[str]
    changed_at: datetime
    data: dict

    def __init__(self, history: Dict):
        self.data = history
        self.idempotency_key = str(history.get("id"))
        self.changed_at = dt_from_iso_time_string(history.get("created"))
        status_item = next(
            (
                item
                for item in history.get("items", [])
                if item.get("field") == "status"
            ),
            None,
        )
        self.from_status = status_item.get("fromString") if status_item else None
        self.to_status = status_item.get("toString") if status_item else None


@dataclass
class JiraIssue:
    """
    One Jira issue from a /rest/api/3/search/jql response (with
    expand=changelog). Deliberately keeps only the fields this
    integration actually uses (status, status_category, plus a handful
    exposed via `data` for display) -- Jira's full issue payload has far
    more fields than that, most of them provider-specific (custom fields
    whose ids vary per Jira instance) and unused here.
    """

    id: str
    key: str
    status: Optional[str]
    status_category: Optional[str]
    created: datetime
    updated: datetime
    changelog: List[JiraChangelogEntry] = field(default_factory=list)
    data: dict = field(default_factory=dict)

    def __init__(self, issue: Dict):
        fields = issue.get("fields", {}) or {}
        self.id = str(issue.get("id"))
        self.key = issue.get("key")

        status = fields.get("status") or {}
        self.status = status.get("name")
        self.status_category = (status.get("statusCategory") or {}).get("name")

        self.created = dt_from_iso_time_string(fields.get("created"))
        self.updated = dt_from_iso_time_string(fields.get("updated"))

        self.data = {
            "summary": fields.get("summary"),
            "issue_type": (fields.get("issuetype") or {}).get("name"),
            "assignee": (fields.get("assignee") or {}).get("displayName"),
            "reporter": (fields.get("reporter") or {}).get("displayName"),
        }

        histories = (issue.get("changelog") or {}).get("histories") or []
        # Only entries that actually changed `status` -- most changelog
        # history entries are for other fields (comments, priority,
        # assignee, ...) and would otherwise become TicketState rows with
        # a meaningless null to_status.
        self.changelog = [
            entry
            for entry in (JiraChangelogEntry(h) for h in histories)
            if entry.to_status is not None
        ]
