from mhq.service.settings.models import (
    ConfigurationSettings,
    DefaultSyncDaysSetting,
    IncidentSettings,
    ExcludedPRsSetting,
    IncidentTypesSetting,
    IncidentSourcesSetting,
)
from mhq.store.models import EntityType


def adapt_configuration_settings_response(config_settings: ConfigurationSettings):
    def _add_entity(config_settings: ConfigurationSettings, response):

        if config_settings.entity_type == EntityType.USER:
            response["user_id"] = str(config_settings.entity_id)

        if config_settings.entity_type == EntityType.TEAM:
            response["team_id"] = str(config_settings.entity_id)

        if config_settings.entity_type == EntityType.ORG:
            response["org_id"] = str(config_settings.entity_id)

        return response

    def _add_setting_data(config_settings: ConfigurationSettings, response):

        if isinstance(config_settings.specific_settings, IncidentSettings):
            response["setting"] = {
                "title_includes": config_settings.specific_settings.title_filters
            }
        if isinstance(config_settings.specific_settings, ExcludedPRsSetting):
            response["setting"] = {
                "excluded_pr_ids": config_settings.specific_settings.excluded_pr_ids
            }

        if isinstance(config_settings.specific_settings, IncidentTypesSetting):
            response["setting"] = {
                "incident_types": [
                    incident_type.value
                    for incident_type in config_settings.specific_settings.incident_types
                ]
            }

        if isinstance(config_settings.specific_settings, IncidentSourcesSetting):
            response["setting"] = {
                "incident_sources": [
                    source.value
                    for source in config_settings.specific_settings.incident_sources
                ]
            }

        if isinstance(config_settings.specific_settings, DefaultSyncDaysSetting):
            response["setting"] = {
                "default_sync_days": config_settings.specific_settings.default_sync_days
            }

        # ADD NEW API ADAPTER HERE

        return response

    response = {
        "created_at": config_settings.created_at.isoformat(),
        "updated_at": config_settings.updated_at.isoformat(),
    }
    response = _add_entity(config_settings, response)
    response = _add_setting_data(config_settings, response)
    return response
