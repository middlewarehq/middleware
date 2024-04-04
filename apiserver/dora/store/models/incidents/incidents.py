from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    func,
    Integer,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB, ENUM

from dora.store import Base
from dora.store.models.incidents.enums import IncidentType, IncidentBookmarkType


class Incident(Base):
    __tablename__ = "Incident"

    id = Column(UUID(as_uuid=True), primary_key=True)
    provider = Column(String)
    key = Column(String)
    incident_number = Column(Integer)
    title = Column(String)
    status = Column(String)
    creation_date = Column(DateTime(timezone=True))
    acknowledged_date = Column(DateTime(timezone=True))
    resolved_date = Column(DateTime(timezone=True))
    assigned_to = Column(String)
    assignees = Column(ARRAY(String))
    incident_type = Column(ENUM(IncidentType), default=IncidentType.INCIDENT)
    meta = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    def __hash__(self):
        return hash(self.id)


class IncidentOrgIncidentServiceMap(Base):
    __tablename__ = "IncidentOrgIncidentServiceMap"

    incident_id = Column(
        UUID(as_uuid=True), ForeignKey("Incident.id"), primary_key=True
    )
    service_id = Column(
        UUID(as_uuid=True), ForeignKey("OrgIncidentService.id"), primary_key=True
    )


class IncidentsBookmark(Base):
    __tablename__ = "IncidentsBookmark"

    id = Column(UUID(as_uuid=True), primary_key=True)
    provider = Column(String)
    entity_id = Column(UUID(as_uuid=True))
    entity_type = Column(
        ENUM(IncidentBookmarkType), default=IncidentBookmarkType.SERVICE
    )
    bookmark = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
