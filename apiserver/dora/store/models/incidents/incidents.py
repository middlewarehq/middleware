from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    func,
    Integer,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB, ENUM

from dora.store import db
from dora.store.models.incidents.enums import IncidentType, IncidentBookmarkType


class Incident(db.Model):
    __tablename__ = "Incident"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    provider = db.Column(String)
    key = db.Column(String)
    incident_number = db.Column(Integer)
    title = db.Column(String)
    status = db.Column(String)
    creation_date = db.Column(DateTime(timezone=True))
    acknowledged_date = db.Column(DateTime(timezone=True))
    resolved_date = db.Column(DateTime(timezone=True))
    assigned_to = db.Column(String)
    assignees = db.Column(ARRAY(String))
    incident_type = db.Column(ENUM(IncidentType), default=IncidentType.INCIDENT)
    meta = db.Column(JSONB, default={})
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __hash__(self):
        return hash(self.id)


class IncidentOrgIncidentServiceMap(db.Model):
    __tablename__ = "IncidentOrgIncidentServiceMap"

    incident_id = db.Column(
        UUID(as_uuid=True), ForeignKey("Incident.id"), primary_key=True
    )
    service_id = db.Column(
        UUID(as_uuid=True), ForeignKey("OrgIncidentService.id"), primary_key=True
    )


class IncidentsBookmark(db.Model):
    __tablename__ = "IncidentsBookmark"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    provider = db.Column(String)
    entity_id = db.Column(UUID(as_uuid=True))
    entity_type = db.Column(
        ENUM(IncidentBookmarkType), default=IncidentBookmarkType.SERVICE
    )
    bookmark = db.Column(DateTime(timezone=True), server_default=func.now())
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
