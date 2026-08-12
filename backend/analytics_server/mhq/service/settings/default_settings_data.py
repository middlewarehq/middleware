from mhq.store.models.incidents import IncidentSource, IncidentType
from mhq.store.models.settings import SettingType

MIN_CYCLE_TIME_THRESHOLD = 3600


def get_default_setting_data(setting_type: SettingType):
    if setting_type == SettingType.INCIDENT_SETTING:
        return {"title_filters": []}

    if setting_type == SettingType.EXCLUDED_PRS_SETTING:
        return {"excluded_pr_ids": []}

    if setting_type == SettingType.INCIDENT_SOURCES_SETTING:
        # CLUSTOX: deliberately NOT `list(IncidentSource)` -- that would
        # silently opt every org with no saved setting into any new source
        # value added to the enum. JIRA_ISSUE is opt-in only; an org has to
        # explicitly save this setting with it included. Adding a new
        # non-opt-in source in the future should extend this literal list.
        incident_sources = [
            IncidentSource.INCIDENT_SERVICE,
            IncidentSource.INCIDENT_TEAM,
            IncidentSource.GIT_REPO,
        ]
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

    if setting_type == SettingType.JIRA_INCIDENT_ISSUE_TYPES_SETTING:
        # CLUSTOX: which Jira issue types count as an incident when
        # IncidentSource.JIRA_ISSUE is enabled -- see
        # docs/JIRA_INTEGRATION_PROPOSAL.md.
        return {"issue_types": ["Bug"]}

    # CLUSTOX: deliberately empty, not the DORA "High" band. The spec's
    # zero-config guarantee -- "no benchmark at any level means no line, no
    # caption, and the card renders exactly as it does today" -- is only
    # reachable if nothing materialises a target nobody asked for. Shipping
    # numbers here made every card in every workspace sprout a target line
    # and a "the default benchmark" caption the first time any admin opened
    # any settings form, and made a team that had never set a benchmark
    # report source: "team" for every metric. A superadmin types the
    # baseline in; the code does not guess it.
    if setting_type == SettingType.BENCHMARK_SETTING:
        return {
            "lead_time": None,
            "deployment_frequency": None,
            "change_failure_rate": None,
            "mean_time_to_recovery": None,
            "lines_of_code": None,
        }

    # ADD NEW DEFAULT SETTING HERE

    raise Exception(f"Invalid Setting Type: {setting_type}")
