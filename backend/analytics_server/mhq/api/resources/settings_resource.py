from mhq.service.settings.models import (
    ConfigurationSettings,
    DefaultSyncDaysSetting,
    IncidentSettings,
    ExcludedPRsSetting,
    IncidentTypesSetting,
    IncidentSourcesSetting,
    IncidentPRsSetting,
    BenchmarkSetting,
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

        # CLUSTOX: the global row's entity_id is a fixed sentinel, not a real
        # entity -- echoing it back as an id invites a caller to treat it as
        # one (e.g. look it up as a team). A "scope" marker says what the row
        # is without implying it resolves to anything.
        if config_settings.entity_type == EntityType.GLOBAL:
            response["scope"] = "global"

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

        if isinstance(config_settings.specific_settings, IncidentPRsSetting):
            response["setting"] = {
                "include_revert_prs": config_settings.specific_settings.include_revert_prs,
                "filters": config_settings.specific_settings.filters,
            }

        if isinstance(config_settings.specific_settings, BenchmarkSetting):
            # CLUSTOX: None means "not set at this scope, inherit" and must
            # round-trip as null, not be dropped or coerced to 0 -- the
            # config form distinguishes "no target", "target of 0" and
            # "target inherited from the global baseline".
            response["setting"] = {
                "lead_time": config_settings.specific_settings.lead_time,
                "deployment_frequency": config_settings.specific_settings.deployment_frequency,
                "change_failure_rate": config_settings.specific_settings.change_failure_rate,
                "mean_time_to_recovery": config_settings.specific_settings.mean_time_to_recovery,
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
