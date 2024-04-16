import uuid

from sqlalchemy import String, Boolean, DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM

from dora.store import db
from dora.store.models.code.workflows.enums import (
    RepoWorkflowType,
    RepoWorkflowProviders,
    RepoWorkflowRunsStatus,
)


class RepoWorkflow(db.Model):
    __tablename__ = "RepoWorkflow"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_repo_id = db.Column(UUID(as_uuid=True), ForeignKey("OrgRepo.id"))
    type = db.Column(ENUM(RepoWorkflowType))
    provider = db.Column(ENUM(RepoWorkflowProviders))
    provider_workflow_id = db.Column(String, nullable=False)
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    meta = db.Column(JSONB, default="{}")
    is_active = db.Column(Boolean, default=True)
    name = db.Column(String)


class RepoWorkflowRuns(db.Model):
    __tablename__ = "RepoWorkflowRuns"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repo_workflow_id = db.Column(UUID(as_uuid=True), ForeignKey("RepoWorkflow.id"))
    provider_workflow_run_id = db.Column(String, nullable=False)
    event_actor = db.Column(String)
    head_branch = db.Column(String)
    status = db.Column(ENUM(RepoWorkflowRunsStatus))
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    conducted_at = db.Column(DateTime(timezone=True), server_default=func.now())
    meta = db.Column(JSONB, default="{}")
    duration = db.Column(Integer)
    html_url = db.Column(String)

    def __hash__(self):
        return hash(self.id)


class RepoWorkflowRunsBookmark(db.Model):
    __tablename__ = "RepoWorkflowRunsBookmark"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repo_workflow_id = db.Column(UUID(as_uuid=True), ForeignKey("RepoWorkflow.id"))
    bookmark = db.Column(String)
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
