from datetime import datetime

import pytz
from sqlalchemy import Column, String, DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY, ENUM

from dora.store import Base
from dora.store.models.code.enums import (
    PullRequestEventType,
    PullRequestState,
    PullRequestRevertPRMappingActorType,
)


class PullRequest(Base):
    __tablename__ = "PullRequest"

    id = Column(UUID(as_uuid=True), primary_key=True)
    repo_id = Column(UUID(as_uuid=True), ForeignKey("OrgRepo.id"))
    title = Column(String)
    url = Column(String)
    number = Column(String)
    author = Column(String)
    state = Column(ENUM(PullRequestState))
    requested_reviews = Column(ARRAY(String))
    base_branch = Column(String)
    head_branch = Column(String)
    data = Column(JSONB)
    created_at = Column(DateTime(timezone=True))
    updated_at = Column(DateTime(timezone=True))
    state_changed_at = Column(DateTime(timezone=True))
    first_response_time = Column(Integer)
    rework_time = Column(Integer)
    merge_time = Column(Integer)
    cycle_time = Column(Integer)
    reviewers = Column(ARRAY(String))
    meta = Column(JSONB)
    provider = Column(String)
    rework_cycles = Column(Integer, default=0)
    first_commit_to_open = Column(Integer)
    merge_to_deploy = Column(Integer)
    lead_time = Column(Integer)
    merge_commit_sha = Column(String)
    created_in_db_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_in_db_at = Column(
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


class PullRequestEvent(Base):
    __tablename__ = "PullRequestEvent"

    id = Column(UUID(as_uuid=True), primary_key=True)
    pull_request_id = Column(UUID(as_uuid=True), ForeignKey("PullRequest.id"))
    type = Column(ENUM(PullRequestEventType))
    data = Column(JSONB)
    created_at = Column(DateTime(timezone=True))
    idempotency_key = Column(String)
    org_repo_id = Column(UUID(as_uuid=True), ForeignKey("OrgRepo.id"))
    actor_username = Column(String)
    created_in_db_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_in_db_at = Column(
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


class PullRequestCommit(Base):
    __tablename__ = "PullRequestCommit"

    hash = Column(String, primary_key=True)
    pull_request_id = Column(UUID(as_uuid=True), ForeignKey("PullRequest.id"))
    message = Column(String)
    url = Column(String)
    data = Column(JSONB)
    author = Column(String)
    created_at = Column(DateTime(timezone=True))
    org_repo_id = Column(UUID(as_uuid=True), ForeignKey("OrgRepo.id"))
    created_in_db_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_in_db_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class BookmarkMergeToDeployBroker(Base):
    __tablename__ = "BookmarkMergeToDeployBroker"

    repo_id = Column(UUID(as_uuid=True), primary_key=True)
    bookmark = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    @property
    def bookmark_date(self):
        if not self.bookmark:
            return None
        return datetime.fromisoformat(self.bookmark).astimezone(tz=pytz.UTC)


class PullRequestRevertPRMapping(Base):
    __tablename__ = "PullRequestRevertPRMapping"

    pr_id = Column(
        UUID(as_uuid=True),
        ForeignKey("PullRequest.id"),
        primary_key=True,
        nullable=False,
    )
    actor_type = Column(
        ENUM(PullRequestRevertPRMappingActorType), primary_key=True, nullable=False
    )
    actor = Column(UUID(as_uuid=True), ForeignKey("Users.id"))
    reverted_pr = Column(
        UUID(as_uuid=True), ForeignKey("PullRequest.id"), nullable=False
    )
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
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
