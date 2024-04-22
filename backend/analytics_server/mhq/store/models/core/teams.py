import uuid

from sqlalchemy import (
    func,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY

from mhq.store import db


class Team(db.Model):
    __tablename__ = "Team"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = db.Column(UUID(as_uuid=True), db.ForeignKey("Organization.id"))
    name = db.Column(db.String)
    member_ids = db.Column(ARRAY(UUID(as_uuid=True)), nullable=False)
    manager_id = db.Column(UUID(as_uuid=True), db.ForeignKey("Users.id"))
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    is_deleted = db.Column(db.Boolean, default=False)

    def __hash__(self):
        return hash(self.id)
