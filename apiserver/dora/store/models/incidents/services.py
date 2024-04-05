from dora.store import Base
from sqlalchemy import (
    Column,
    String,
    DateTime,
    ForeignKey,
    func,
    Boolean,
    Integer,
)
from sqlalchemy.dialects.postgresql import UUID, ARRAY, JSONB, ENUM
from sqlalchemy.orm import relationship

from dora.store.models.incidents import IncidentSource


class OrgIncidentService(Base):
    __tablename__ = "OrgIncidentService"

    id = Column(UUID(as_uuid=True), primary_key=True)
    org_id = Column(UUID(as_uuid=True), ForeignKey("Organization.id"))
    name = Column(String)
    provider = Column(String)
    key = Column(String)
    auto_resolve_timeout = Column(Integer)
    acknowledgement_timeout = Column(Integer)
    created_by = Column(String)
    provider_team_keys = Column(ARRAY(String))
    status = Column(String)
    is_deleted = Column(Boolean, default=False)
    meta = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    source_type = Column(
        ENUM(IncidentSource), default=IncidentSource.INCIDENT_SERVICE, nullable=False
    )


class TeamIncidentService(Base):
    __tablename__ = "TeamIncidentService"

    id = Column(UUID(as_uuid=True), primary_key=True)
    team_id = Column(UUID(as_uuid=True), ForeignKey("Team.id"))
    service_id = Column(UUID(as_uuid=True), ForeignKey("OrgIncidentService.id"))
    OrgIncidentService = relationship("OrgIncidentService", lazy="joined")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
