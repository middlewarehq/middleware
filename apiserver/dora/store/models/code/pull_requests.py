from datetime import datetime

import pytz
from sqlalchemy import String, DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY, ENUM

from dora.store import db
from dora.store.models.code.enums import (
    PullRequestEventType,
    PullRequestState,
    PullRequestRevertPRMappingActorType,
)


class PullRequest(db.Model):
    __tablename__ = "PullRequest"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    repo_id = db.Column(UUID(as_uuid=True), ForeignKey("OrgRepo.id"))
    title = db.Column(String)
    url = db.Column(String)
    number = db.Column(String)
    author = db.Column(String)
    state = db.Column(ENUM(PullRequestState))
    requested_reviews = db.Column(ARRAY(String))
    base_branch = db.Column(String)
    head_branch = db.Column(String)
    data = db.Column(JSONB)
    created_at = db.Column(DateTime(timezone=True))
    updated_at = db.Column(DateTime(timezone=True))
    state_changed_at = db.Column(DateTime(timezone=True))
    first_response_time = db.Column(Integer)
    rework_time = db.Column(Integer)
    merge_time = db.Column(Integer)
    cycle_time = db.Column(Integer)
    reviewers = db.Column(ARRAY(String))
    meta = db.Column(JSONB)
    provider = db.Column(String)
    rework_cycles = db.Column(Integer, default=0)
    first_commit_to_open = db.Column(Integer)
    merge_to_deploy = db.Column(Integer)
    lead_time = db.Column(Integer)
    merge_commit_sha = db.Column(String)
    created_in_db_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_in_db_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __eq__(self, other):
        return self.id == other.id

    def __lt__(self, other):
        return self.id < other.id

    def __hash__(self):
        return hash(self.id)

    @property
    def commits(self) -> int:
        return self.meta.get("code_stats", {}).get("commits", 0)

    @property
    def additions(self) -> int:
        return self.meta.get("code_stats", {}).get("additions", 0)

    @property
    def deletions(self) -> int:
        return self.meta.get("code_stats", {}).get("deletions", 0)

    @property
    def changed_files(self) -> int:
        return self.meta.get("code_stats", {}).get("changed_files", 0)

    @property
    def comments(self) -> int:
        return self.meta.get("code_stats", {}).get("comments", 0)

    @property
    def username(self) -> str:
        return self.meta.get("user_profile", {}).get("username", "")


class PullRequestEvent(db.Model):
    __tablename__ = "PullRequestEvent"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    pull_request_id = db.Column(UUID(as_uuid=True), ForeignKey("PullRequest.id"))
    type = db.Column(ENUM(PullRequestEventType))
    data = db.Column(JSONB)
    created_at = db.Column(DateTime(timezone=True))
    idempotency_key = db.Column(String)
    org_repo_id = db.Column(UUID(as_uuid=True), ForeignKey("OrgRepo.id"))
    actor_username = db.Column(String)
    created_in_db_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_in_db_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    @property
    def state(self):
        if self.type in [
            PullRequestEventType.REVIEW.value,
            PullRequestEventType.REVIEW,
        ]:
            return self.data.get("state", "")

        return ""


class PullRequestCommit(db.Model):
    __tablename__ = "PullRequestCommit"

    hash = db.Column(String, primary_key=True)
    pull_request_id = db.Column(UUID(as_uuid=True), ForeignKey("PullRequest.id"))
    message = db.Column(String)
    url = db.Column(String)
    data = db.Column(JSONB)
    author = db.Column(String)
    created_at = db.Column(DateTime(timezone=True))
    org_repo_id = db.Column(UUID(as_uuid=True), ForeignKey("OrgRepo.id"))
    created_in_db_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_in_db_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PullRequestRevertPRMapping(db.Model):
    __tablename__ = "PullRequestRevertPRMapping"

    pr_id = db.Column(
        UUID(as_uuid=True),
        ForeignKey("PullRequest.id"),
        primary_key=True,
        nullable=False,
    )
    actor_type = db.Column(
        ENUM(PullRequestRevertPRMappingActorType), primary_key=True, nullable=False
    )
    actor = db.Column(UUID(as_uuid=True), ForeignKey("Users.id"))
    reverted_pr = db.Column(
        UUID(as_uuid=True), ForeignKey("PullRequest.id"), nullable=False
    )
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __hash__(self):
        return hash((self.pr_id, self.reverted_pr))

    def __eq__(self, other):
        return (
            isinstance(other, PullRequestRevertPRMapping)
            and self.pr_id == other.pr_id
            and self.reverted_pr == other.reverted_pr
        )
