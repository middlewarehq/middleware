from enum import Enum

from sqlalchemy import Column, DateTime, ForeignKey, func, Boolean
from sqlalchemy.dialects.postgresql import UUID, ENUM, JSONB

from dora.store import Base
from dora.store.models.settings.enums import EntityType

"""
All Data config settings will be stored in the below table.
"""


class SettingType(Enum):
    INCIDENT_SETTING = "INCIDENT_SETTING"
    INCIDENT_TYPES_SETTING = "INCIDENT_TYPES_SETTING"
    INCIDENT_SOURCES_SETTING = "INCIDENT_SOURCES_SETTING"
    EXCLUDED_PRS_SETTING = "EXCLUDED_PRS_SETTING"


class Settings(Base):
    __tablename__ = "Settings"

    entity_id = Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    entity_type = Column(ENUM(EntityType), primary_key=True, nullable=False)
    setting_type = Column(ENUM(SettingType), primary_key=True, nullable=False)
    updated_by = Column(UUID(as_uuid=True), ForeignKey("Users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    data = Column(JSONB, default="{}")
    is_deleted = Column(Boolean, default=False)
