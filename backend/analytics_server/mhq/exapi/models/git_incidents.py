from dataclasses import dataclass
from datetime import datetime

from mhq.store.models.code import PullRequest


@dataclass
class RevertPRMap:
    revert_pr: PullRequest
    original_pr: PullRequest
    created_at: datetime
    updated_at: datetime
