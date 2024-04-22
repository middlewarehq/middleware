from sqlalchemy import (
    func,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB, ENUM
from sqlalchemy.orm import relationship

from mhq.store import db
from mhq.store.models.incidents import IncidentSource


class OrgIncidentService(db.Model):
    __tablename__ = "OrgIncidentService"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    org_id = db.Column(UUID(as_uuid=True), db.ForeignKey("Organization.id"))
    name = db.Column(db.String)
    provider = db.Column(db.String)
    key = db.Column(db.String)
    auto_resolve_timeout = db.Column(db.Integer)
    acknowledgement_timeout = db.Column(db.Integer)
    created_by = db.Column(db.String)
    provider_team_keys = db.Column(ARRAY(db.String))
    status = db.Column(db.String)
    is_deleted = db.Column(db.Boolean, default=False)
    meta = db.Column(JSONB, default={})
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    source_type = db.Column(
        ENUM(IncidentSource), default=IncidentSource.INCIDENT_SERVICE, nullable=False
    )


class TeamIncidentService(db.Model):
    __tablename__ = "TeamIncidentService"

    id = db.Column(UUID(as_uuid=True), primary_key=True)
    team_id = db.Column(UUID(as_uuid=True), db.ForeignKey("Team.id"))
    service_id = db.Column(UUID(as_uuid=True), db.ForeignKey("OrgIncidentService.id"))
    OrgIncidentService = relationship("OrgIncidentService", lazy="joined")
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
