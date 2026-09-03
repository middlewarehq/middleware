from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID

from mhq.store import db


class Sprint(db.Model):
    """
    A Jira (Scrum) board's sprint, with planned/completed issue counts
    already computed -- the Sprint rollup chart's "planned vs. shipped,
    per sprint" needs exactly these two numbers, never per-ticket
    detail, so this deliberately doesn't have a per-ticket
    sprint-membership join table (see the migration's own comment).

    Re-fetched and upserted in full every sync cycle, not
    incrementally bookmarked: a project typically has a small, bounded
    number of sprints, and a sprint's completed count can keep changing
    after it closes (a straggler ticket resolved late) -- unlike a
    ticket's own append-only status history, there's no safe "only
    look at what changed since X" watermark here.
    """

    __tablename__ = "Sprint"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    org_project_id = db.Column(UUID(as_uuid=True), db.ForeignKey("OrgProject.id"))
    provider = db.Column(db.String)
    external_id = db.Column(db.String)
    name = db.Column(db.String)
    state = db.Column(db.String)
    start_date = db.Column(db.DateTime(timezone=True))
    end_date = db.Column(db.DateTime(timezone=True))
    planned_count = db.Column(db.Integer, default=0)
    completed_count = db.Column(db.Integer, default=0)
    idempotency_key = db.Column(db.String)
    created_in_db_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_in_db_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __hash__(self):
        return hash(self.id)
