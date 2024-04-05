import uuid

from dora.store import Base
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, Integer, func
from sqlalchemy.dialects.postgresql import UUID, JSONB, ENUM

from dora.store.models.code.workflows.enums import (
    RepoWorkflowType,
    RepoWorkflowProviders,
    RepoWorkflowRunsStatus,
)


class RepoWorkflow(Base):
    __tablename__ = "RepoWorkflow"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_repo_id = Column(UUID(as_uuid=True), ForeignKey("OrgRepo.id"))
    type = Column(ENUM(RepoWorkflowType))
    provider = Column(ENUM(RepoWorkflowProviders))
    provider_workflow_id = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    meta = Column(JSONB, default="{}")
    is_active = Column(Boolean, default=True)
    name = Column(String)


class RepoWorkflowRuns(Base):
    __tablename__ = "RepoWorkflowRuns"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repo_workflow_id = Column(UUID(as_uuid=True), ForeignKey("RepoWorkflow.id"))
    provider_workflow_run_id = Column(String, nullable=False)
    event_actor = Column(String)
    head_branch = Column(String)
    status = Column(ENUM(RepoWorkflowRunsStatus))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    conducted_at = Column(DateTime(timezone=True), server_default=func.now())
    meta = Column(JSONB, default="{}")
    duration = Column(Integer)
    html_url = Column(String)

    def __hash__(self):
        return hash(self.id)


class RepoWorkflowRunsBookmark(Base):
    __tablename__ = "RepoWorkflowRunsBookmark"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    repo_workflow_id = Column(UUID(as_uuid=True), ForeignKey("RepoWorkflow.id"))
    bookmark = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
