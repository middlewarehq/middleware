import uuid

from sqlalchemy import (
    func,
)
from sqlalchemy.dialects.postgresql import UUID, ENUM, JSONB
from mhq.store import db
from mhq.store.models.events.enums import EventType, EventSource


class Event(db.Model):
    __tablename__ = "Event"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = db.Column(UUID(as_uuid=True), db.ForeignKey("Organization.id"))
    type = db.Column(ENUM(EventType), nullable=False)
    source = db.Column(ENUM(EventSource), nullable=False)
    data = db.Column(JSONB, nullable=False)
    meta = db.Column(JSONB, default={})
    error = db.Column(JSONB, default={})
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
