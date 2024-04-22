import uuid

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM

from mhq.store import db
from mhq.store.models.code.workflows.enums import (
    RepoWorkflowType,
    RepoWorkflowProviders,
    RepoWorkflowRunsStatus,
)


class RepoWorkflow(db.Model):
    __tablename__ = "RepoWorkflow"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_repo_id = db.Column(UUID(as_uuid=True), db.ForeignKey("OrgRepo.id"))
    type = db.Column(ENUM(RepoWorkflowType))
    provider = db.Column(ENUM(RepoWorkflowProviders))
    provider_workflow_id = db.Column(db.String, nullable=False)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    meta = db.Column(JSONB, default="{}")
    is_active = db.Column(db.Boolean, default=True)
    name = db.Column(db.String)


class RepoWorkflowRuns(db.Model):
    __tablename__ = "RepoWorkflowRuns"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repo_workflow_id = db.Column(UUID(as_uuid=True), db.ForeignKey("RepoWorkflow.id"))
    provider_workflow_run_id = db.Column(db.String, nullable=False)
    event_actor = db.Column(db.String)
    head_branch = db.Column(db.String)
    status = db.Column(ENUM(RepoWorkflowRunsStatus))
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    conducted_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    meta = db.Column(JSONB, default="{}")
    duration = db.Column(db.Integer)
    html_url = db.Column(db.String)

    def __hash__(self):
        return hash(self.id)


class RepoWorkflowRunsBookmark(db.Model):
    __tablename__ = "RepoWorkflowRunsBookmark"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repo_workflow_id = db.Column(UUID(as_uuid=True), db.ForeignKey("RepoWorkflow.id"))
    bookmark = db.Column(db.String)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
