import uuid

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID

from mhq.store import db


class OrgProject(db.Model):
    """
    Org-level catalog of a project-tracking tool's projects (Jira, to start).

    Mirrors OrgRepo -- same "org-wide catalog, team join table" shape --
    minus the code-specific columns (default_branch, language, contributors)
    that have no equivalent for a project-tracking tool. See
    docs/JIRA_INTEGRATION_PROPOSAL.md for the phase this belongs to.
    """

    __tablename__ = "OrgProject"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = db.Column(UUID(as_uuid=True), db.ForeignKey("Organization.id"))
    key = db.Column(db.String)
    name = db.Column(db.String)
    provider = db.Column(db.String)
    idempotency_key = db.Column(db.String)
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __hash__(self):
        return hash(self.id)


class TeamProjects(db.Model):
    """Join table: which OrgProject(s) a team tracks. Mirrors TeamRepos."""

    __tablename__ = "TeamProjects"

    team_id = db.Column(UUID(as_uuid=True), db.ForeignKey("Team.id"), primary_key=True)
    org_project_id = db.Column(
        UUID(as_uuid=True), db.ForeignKey("OrgProject.id"), primary_key=True
    )
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
