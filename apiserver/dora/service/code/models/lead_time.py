from dataclasses import dataclass
from typing import Optional
from datetime import datetime


@dataclass
class LeadTimeMetrics:
    first_commit_to_open: float = 0
    first_response_time: float = 0
    rework_time: float = 0
    merge_time: float = 0
    merge_to_deploy: float = 0
    pr_count: float = 0

    merged_at: Optional[datetime] = None
    pr_id: Optional[str] = None

    def __eq__(self, other):
        if not isinstance(other, LeadTimeMetrics):
            raise ValueError(
                f"Cannot compare type: LeadTimeMetrics with type: {type(other)}"
            )
        if self.pr_id is None:
            raise ValueError("PR ID is None")
        return self.pr_id == other.pr_id

    def __hash__(self):
        if self.pr_id is None:
            raise ValueError("PR ID is None")
        return hash(self.pr_id)

    @property
    def lead_time(self):
        return (
            self.first_commit_to_open
            + self.first_response_time
            + self.rework_time
            + self.merge_time
            + self.merge_to_deploy
        )

    @property
    def cycle_time(self):
        return (
            self.first_response_time
            + self.rework_time
            + self.merge_time
            + self.merge_to_deploy
        )
