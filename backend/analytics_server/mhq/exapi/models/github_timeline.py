from datetime import datetime
from dataclasses import dataclass
from typing import Any, Optional, Dict, cast


from mhq.exapi.schemas.timeline import (
    GitHubPullTimelineEvent,
)
from mhq.store.models.code.enums import PullRequestEventType
from mhq.utils.log import LOG
from mhq.utils.time import dt_from_iso_time_string


@dataclass
class GithubPullRequestTimelineEvents:
    EVENT_CONFIG = {
        "reviewed": {
            "actor_path": "user",
            "timestamp_field": "submitted_at",
            "id_path": "id",
        },
        "ready_for_review": {
            "actor_path": "actor",
            "timestamp_field": "created_at",
            "id_path": "id",
        },
        "commented": {
            "actor_path": "user",
            "timestamp_field": "created_at",
            "id_path": "id",
        },
        "committed": {
            "actor_path": "author.name",
            "timestamp_field": "author.date",
            "id_path": "sha",
        },
        "default": {
            "actor_path": "actor",
            "timestamp_field": "created_at",
            "id_path": "id",
        },
    }

    def __init__(self, event_type: str, data: GitHubPullTimelineEvent):
        self.event_type = event_type
        self.data = data

    def _get_nested_value(self, path: str) -> Optional[Any]:
        keys = path.split(".")
        current = self.data

        for key in keys:
            if isinstance(current, dict) and key in current:
                current = current[key]
            else:
                return None
        return current

    @property
    def user(self) -> Optional[str]:
        config = self.EVENT_CONFIG.get(self.event_type, self.EVENT_CONFIG["default"])
        actor_path = config["actor_path"]

        if not actor_path:
            return None

        if self.event_type == "committed":
            return self._get_nested_value(actor_path)

        user_data = self._get_nested_value(actor_path)
        if not user_data:
            return None
        if isinstance(user_data, dict) and "login" in user_data:
            return user_data["login"]
        elif hasattr(user_data, "login"):
            return user_data.login

        LOG.warning(
            f"User data does not contain login field for event type: {self.event_type}"
        )
        return None

    @property
    def timestamp(self) -> Optional[datetime]:
        config = self.EVENT_CONFIG.get(self.event_type, self.EVENT_CONFIG["default"])
        timestamp_field = config["timestamp_field"]
        timestamp_value = self._get_nested_value(timestamp_field)

        if timestamp_value:
            timestamp_str = str(timestamp_value)
            return dt_from_iso_time_string(timestamp_str)
        return None

    @property
    def raw_data(self) -> Dict:
        return cast(Dict, self.data)

    @property
    def id(self) -> Optional[str]:
        config = self.EVENT_CONFIG.get(self.event_type, self.EVENT_CONFIG["default"])
        id_path = config["id_path"]
        id_value = self._get_nested_value(id_path)
        return str(id_value) if id_value is not None else None

    @property
    def type(self) -> Optional[PullRequestEventType]:
        event_type_mapping = {
            "assigned": PullRequestEventType.ASSIGNED,
            "closed": PullRequestEventType.CLOSED,
            "commented": PullRequestEventType.COMMENTED,
            "committed": PullRequestEventType.COMMITTED,
            "convert_to_draft": PullRequestEventType.CONVERT_TO_DRAFT,
            "head_ref_deleted": PullRequestEventType.HEAD_REF_DELETED,
            "head_ref_force_pushed": PullRequestEventType.HEAD_REF_FORCE_PUSHED,
            "labeled": PullRequestEventType.LABELED,
            "locked": PullRequestEventType.LOCKED,
            "merged": PullRequestEventType.MERGED,
            "ready_for_review": PullRequestEventType.READY_FOR_REVIEW,
            "referenced": PullRequestEventType.REFERENCED,
            "reopened": PullRequestEventType.REOPENED,
            "review_dismissed": PullRequestEventType.REVIEW_DISMISSED,
            "review_requested": PullRequestEventType.REVIEW_REQUESTED,
            "review_request_removed": PullRequestEventType.REVIEW_REQUEST_REMOVED,
            "reviewed": PullRequestEventType.REVIEW,
            "unassigned": PullRequestEventType.UNASSIGNED,
            "unlabeled": PullRequestEventType.UNLABELED,
            "unlocked": PullRequestEventType.UNLOCKED,
        }
        return event_type_mapping.get(self.event_type, PullRequestEventType.UNKNOWN)
