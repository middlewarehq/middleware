from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY, ENUM

from mhq.store import db
from mhq.store.models.code.enums import (
    PullRequestEventType,
    PullRequestState,
    PullRequestRevertPRMappingActorType,
)


class PullRequest(db.Model):
    __tablename__ = "PullRequest"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    repo_id = db.Column(UUID(as_uuid=True), db.ForeignKey("OrgRepo.id"))
    title = db.Column(db.String)
    url = db.Column(db.String)
    number = db.Column(db.String)
    author = db.Column(db.String)
    state = db.Column(ENUM(PullRequestState))
    requested_reviews = db.Column(ARRAY(db.String))
    base_branch = db.Column(db.String)
    head_branch = db.Column(db.String)
    data = db.Column(JSONB)
    created_at = db.Column(db.DateTime(timezone=True))
    updated_at = db.Column(db.DateTime(timezone=True))
    state_changed_at = db.Column(db.DateTime(timezone=True))
    first_response_time = db.Column(db.Integer)
    rework_time = db.Column(db.Integer)
    merge_time = db.Column(db.Integer)
    cycle_time = db.Column(db.Integer)
    reviewers = db.Column(ARRAY(db.String))
    meta = db.Column(JSONB)
    provider = db.Column(db.String)
    rework_cycles = db.Column(db.Integer, default=0)
    first_commit_to_open = db.Column(db.Integer)
    merge_to_deploy = db.Column(db.Integer)
    merge_commit_sha = db.Column(db.String)
    created_in_db_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_in_db_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
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
    pull_request_id = db.Column(UUID(as_uuid=True), db.ForeignKey("PullRequest.id"))
    type = db.Column(ENUM(PullRequestEventType))
    data = db.Column(JSONB)
    created_at = db.Column(db.DateTime(timezone=True))
    idempotency_key = db.Column(db.String)
    org_repo_id = db.Column(UUID(as_uuid=True), db.ForeignKey("OrgRepo.id"))
    actor_username = db.Column(db.String)
    created_in_db_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_in_db_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
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

    hash = db.Column(db.String, primary_key=True)
    pull_request_id = db.Column(UUID(as_uuid=True), db.ForeignKey("PullRequest.id"))
    message = db.Column(db.String)
    url = db.Column(db.String)
    data = db.Column(JSONB)
    author = db.Column(db.String)
    created_at = db.Column(db.DateTime(timezone=True))
    org_repo_id = db.Column(UUID(as_uuid=True), db.ForeignKey("OrgRepo.id"))
    created_in_db_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_in_db_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class PullRequestRevertPRMapping(db.Model):
    __tablename__ = "PullRequestRevertPRMapping"

    pr_id = db.Column(
        UUID(as_uuid=True),
        db.ForeignKey("PullRequest.id"),
        primary_key=True,
        nullable=False,
    )
    actor_type = db.Column(
        ENUM(PullRequestRevertPRMappingActorType), primary_key=True, nullable=False
    )
    actor = db.Column(UUID(as_uuid=True), db.ForeignKey("Users.id"))
    reverted_pr = db.Column(
        UUID(as_uuid=True), db.ForeignKey("PullRequest.id"), nullable=False
    )
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __hash__(self):
        return hash((self.pr_id, self.reverted_pr))

    def __eq__(self, other):
        return (
            isinstance(other, PullRequestRevertPRMapping)
            and self.pr_id == other.pr_id
            and self.reverted_pr == other.reverted_pr
        )
