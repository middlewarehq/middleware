from enum import Enum

from sqlalchemy import func
from sqlalchemy.dialects.postgresql import UUID, ENUM, JSONB

from mhq.store import db
from mhq.store.models.settings.enums import EntityType

"""
All Data config settings will be stored in the below table.
"""


class SettingType(Enum):
    INCIDENT_SETTING = "INCIDENT_SETTING"
    INCIDENT_TYPES_SETTING = "INCIDENT_TYPES_SETTING"
    INCIDENT_SOURCES_SETTING = "INCIDENT_SOURCES_SETTING"
    EXCLUDED_PRS_SETTING = "EXCLUDED_PRS_SETTING"
    # ADD NEW SETTING TYPE ENUM HERE


class Settings(db.Model):
    __tablename__ = "Settings"

    entity_id = db.Column(UUID(as_uuid=True), primary_key=True, nullable=False)
    entity_type = db.Column(ENUM(EntityType), primary_key=True, nullable=False)
    setting_type = db.Column(ENUM(SettingType), primary_key=True, nullable=False)
    updated_by = db.Column(UUID(as_uuid=True), db.ForeignKey("Users.id"))
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        db.DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    data = db.Column(JSONB, default="{}")
    is_deleted = db.Column(db.Boolean, default=False)
