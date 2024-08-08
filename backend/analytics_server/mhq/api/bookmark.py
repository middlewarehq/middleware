from datetime import datetime, timedelta
from flask import Blueprint
from voluptuous import Schema, Coerce, All, Optional
from mhq.api.request_utils import queryschema

from mhq.store.models.settings import SettingType, EntityType
from mhq.service.query_validator import get_query_validator
from mhq.service.settings.configuration_settings import get_settings_service
from mhq.service.settings.models import DefaultSyncDaysSetting
from mhq.service.bookmark.bookmark import get_bookmark_service
from mhq.utils.time import time_now

app = Blueprint("bookmark", __name__)


@app.route("/orgs/<org_id>/bookmark/reset", methods={"PUT"})
@queryschema(
    Schema(
        {
            Optional("bookmark_timestamp"): All(str, Coerce(datetime.fromisoformat)),
        }
    ),
)
def reset_bookmark(org_id: str, bookmark_timestamp: datetime = None):

    query_validator = get_query_validator()
    query_validator.org_validator(org_id)

    if not bookmark_timestamp:

        settings_service = get_settings_service()
        default_sync_days_setting: DefaultSyncDaysSetting = (
            settings_service.get_or_set_default_settings(
                setting_type=SettingType.DEFAULT_SYNC_DAYS_SETTING,
                entity_type=EntityType.ORG,
                entity_id=org_id,
            ).specific_settings
        )

        default_sync_days = default_sync_days_setting.default_sync_days
        bookmark_timestamp = time_now() - timedelta(default_sync_days)

    bookmark_service = get_bookmark_service()

    bookmark_service.reset_org_bookmarks(org_id, bookmark_timestamp)

    return {"updated_bookmark": bookmark_timestamp.isoformat()}
