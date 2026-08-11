from mhq.store.models.incidents import IncidentSource, IncidentType
from mhq.store.models.settings import SettingType

MIN_CYCLE_TIME_THRESHOLD = 3600


def get_default_setting_data(setting_type: SettingType):
    if setting_type == SettingType.INCIDENT_SETTING:
        return {"title_filters": []}

    if setting_type == SettingType.EXCLUDED_PRS_SETTING:
        return {"excluded_pr_ids": []}

    if setting_type == SettingType.INCIDENT_SOURCES_SETTING:
        incident_sources = list(IncidentSource)
        return {
            "incident_sources": [
                incident_source.value for incident_source in incident_sources
            ]
        }

    if setting_type == SettingType.INCIDENT_TYPES_SETTING:
        incident_types = list(IncidentType)
        return {
            "incident_types": [incident_type.value for incident_type in incident_types]
        }

    if setting_type == SettingType.DEFAULT_SYNC_DAYS_SETTING:
        return {"default_sync_days": 31}

    if setting_type == SettingType.INCIDENT_PRS_SETTING:
        return {
            "include_revert_prs": True,
            "filters": [],
        }

    # CLUSTOX: the baseline a workspace sees before a superadmin edits it.
    # Values are the DORA "High" band, in the same units the metrics API
    # returns: seconds, deployments per week, percent.
    if setting_type == SettingType.BENCHMARK_SETTING:
        return {
            "lead_time": 86400,
            "deployment_frequency": 5,
            "change_failure_rate": 15,
            "mean_time_to_recovery": 3600,
        }

    # ADD NEW DEFAULT SETTING HERE

    raise Exception(f"Invalid Setting Type: {setting_type}")
