from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    func,
    Boolean,
)
from sqlalchemy.dialects.postgresql import UUID

from dora.store import db


class Users(db.Model):
    __tablename__ = "Users"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    org_id = db.Column(UUID(as_uuid=True), ForeignKey("Organization.id"))
    name = db.Column(String)
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    primary_email = db.Column(String)
    is_deleted = db.Column(Boolean, default=False)
    avatar_url = db.Column(String)
