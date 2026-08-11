from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID

from mhq.store import db


class PullRequestTicketMapping(db.Model):
    """
    Which Ticket(s) a PullRequest references, found by scanning its title
    and branch name for a ticket key -- see
    docs/JIRA_INTEGRATION_PROPOSAL.md step 4. A dedicated package rather
    than living under either `code` or `projects`: it's a join across
    those two domains, and cramming it into either one's package would
    make that package responsible for a model it only half owns.

    Many-to-many, not a single ticket_id on PullRequest -- a PR can
    reference more than one ticket (seen in this org's own PR history:
    a title referencing "PZDA-544/546").
    """

    __tablename__ = "PullRequestTicketMapping"

    pr_id = db.Column(UUID(as_uuid=True), db.ForeignKey("PullRequest.id"), primary_key=True)
    ticket_id = db.Column(UUID(as_uuid=True), db.ForeignKey("Ticket.id"), primary_key=True)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
