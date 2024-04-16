import uuid

from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    func,
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY

from dora.store import db


class Team(db.Model):
    __tablename__ = "Team"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = db.Column(UUID(as_uuid=True), ForeignKey("Organization.id"))
    name = db.Column(String)
    member_ids = db.Column(ARRAY(UUID(as_uuid=True)), nullable=False)
    manager_id = db.Column(UUID(as_uuid=True), ForeignKey("Users.id"))
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    is_deleted = db.Column(Boolean)

    def __hash__(self):
        return hash(self.id)
