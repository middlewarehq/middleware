from typing import Optional, List

from sqlalchemy import and_

from dora.store import db
from dora.store.models import (
    Settings,
    SettingType,
    EntityType,
    Users,
)
from dora.utils.time import time_now


class SettingsRepoService:
    def get_setting(
        self, entity_id: str, entity_type: EntityType, setting_type: SettingType
    ) -> Optional[Settings]:
        return (
            db.session.query(Settings)
            .filter(
                and_(
                    Settings.setting_type == setting_type,
                    Settings.entity_type == entity_type,
                    Settings.entity_id == entity_id,
                    Settings.is_deleted == False,
                )
            )
            .one_or_none()
        )

    def create_settings(self, settings: List[Settings]) -> List[Settings]:
        [db.session.merge(setting) for setting in settings]
        db.session.commit()
        return settings

    def save_setting(self, setting: Settings) -> Optional[Settings]:
        db.session.merge(setting)
        db.session.commit()

        return self.get_setting(
            entity_id=setting.entity_id,
            entity_type=setting.entity_type,
            setting_type=setting.setting_type,
        )

    def delete_setting(
        self,
        entity_id: str,
        entity_type: EntityType,
        setting_type: SettingType,
        deleted_by: Users,
    ) -> Optional[Settings]:
        setting = self.get_setting(entity_id, entity_type, setting_type)
        if not setting:
            return

        setting.is_deleted = True
        setting.updated_by = deleted_by.id
        setting.updated_at = time_now()
        db.session.merge(setting)
        db.session.commit()
        return setting

    def get_settings(
        self,
        entity_id: str,
        entity_type: EntityType,
        setting_types: List[SettingType],
    ) -> Optional[Settings]:
        return (
            db.session.query(Settings)
            .filter(
                and_(
                    Settings.setting_type.in_(setting_types),
                    Settings.entity_type == entity_type,
                    Settings.entity_id == entity_id,
                    Settings.is_deleted == False,
                )
            )
            .all()
        )
