from sqlalchemy import (
    func,
)
from sqlalchemy.dialects.postgresql import UUID

from mhq.store import db


class Users(db.Model):
    __tablename__ = "Users"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    org_id = db.Column(UUID(as_uuid=True), db.ForeignKey("Organization.id"))
    name = db.Column(db.String)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    primary_email = db.Column(db.String)
    is_deleted = db.Column(db.Boolean, default=False)
    avatar_url = db.Column(db.String)
