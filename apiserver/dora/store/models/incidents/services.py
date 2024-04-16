from sqlalchemy import (
    String,
    DateTime,
    ForeignKey,
    func,
    Boolean,
    Integer,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB, ENUM
from sqlalchemy.orm import relationship

from dora.store import db
from dora.store.models.incidents import IncidentSource


class OrgIncidentService(db.Model):
    __tablename__ = "OrgIncidentService"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    org_id = db.Column(UUID(as_uuid=True), ForeignKey("Organization.id"))
    name = db.Column(String)
    provider = db.Column(String)
    key = db.Column(String)
    auto_resolve_timeout = db.Column(Integer)
    acknowledgement_timeout = db.Column(Integer)
    created_by = db.Column(String)
    provider_team_keys = db.Column(ARRAY(String))
    status = db.Column(String)
    is_deleted = db.Column(Boolean, default=False)
    meta = db.Column(JSONB, default={})
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    source_type = db.Column(
        ENUM(IncidentSource), default=IncidentSource.INCIDENT_SERVICE, nullable=False
    )


class TeamIncidentService(db.Model):
    __tablename__ = "TeamIncidentService"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    team_id = db.Column(UUID(as_uuid=True), ForeignKey("Team.id"))
    service_id = db.Column(UUID(as_uuid=True), ForeignKey("OrgIncidentService.id"))
    OrgIncidentService = relationship("OrgIncidentService", lazy="joined")
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
