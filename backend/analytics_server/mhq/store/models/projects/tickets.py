from typing import Optional

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID, JSONB

from mhq.store import db


class Ticket(db.Model):
    """
    Current-state row for a Jira (or, later, other project-tracking
    tool's) issue. Mirrors PullRequest -- a current-state row, with
    TicketState as its append-only status-transition history, the same
    split PullRequest/PullRequestEvent already use.

    No rigid column per Jira field: summary/assignee/reporter/issue type
    live in `data` and are exposed as properties, same choice
    PullRequest made for its own provider payload (see `meta`). Jira
    custom fields vary per instance, so a fixed column per field would
    mean a migration every time a new one is wanted.
    """

    __tablename__ = "Ticket"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    org_project_id = db.Column(UUID(as_uuid=True), db.ForeignKey("OrgProject.id"))
    key = db.Column(db.String)
    provider = db.Column(db.String)
    status = db.Column(db.String)
    status_category = db.Column(db.String)
    idempotency_key = db.Column(db.String)
    data = db.Column(JSONB)
    # The provider's own created/updated timestamps -- not this row's own
    # bookkeeping (created_in_db_at/updated_in_db_at below). updated_at is
    # the incremental-sync bookmark cursor.
    created_at = db.Column(db.DateTime(timezone=True))
    updated_at = db.Column(db.DateTime(timezone=True))
    created_in_db_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_in_db_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __hash__(self):
        return hash(self.id)

    @property
    def summary(self) -> Optional[str]:
        return (self.data or {}).get("summary")

    @property
    def issue_type(self) -> Optional[str]:
        return (self.data or {}).get("issue_type")

    @property
    def assignee(self) -> Optional[str]:
        return (self.data or {}).get("assignee")

    @property
    def reporter(self) -> Optional[str]:
        return (self.data or {}).get("reporter")


class TicketState(db.Model):
    """
    One row per status transition for a Ticket -- append-only, same
    pattern as PullRequestEvent. `from_status` is null for a ticket's
    very first recorded state.
    """

    __tablename__ = "TicketState"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    ticket_id = db.Column(UUID(as_uuid=True), db.ForeignKey("Ticket.id"))
    from_status = db.Column(db.String)
    to_status = db.Column(db.String)
    changed_at = db.Column(db.DateTime(timezone=True))
    idempotency_key = db.Column(db.String)
    data = db.Column(JSONB)
    created_in_db_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_in_db_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __hash__(self):
        return hash(self.id)
