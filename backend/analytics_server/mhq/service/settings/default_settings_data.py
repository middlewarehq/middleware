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
        # value added to the enum sight-unseen. Every value below is
        # explicitly chosen.
        #
        # JIRA_ISSUE used to be the one opt-in exception here (an admin had
        # to explicitly turn it on via ConfigureJiraIncidentSourceModalBody).
        # Default flipped to on, matching GIT_REPO's own default: a ticket
        # reopened after being marked resolved is the same kind of "the fix
        # didn't hold" signal a revert PR already is, so it shouldn't need
        # an admin to first discover the switch exists. Unlike GIT_REPO
        # (which has no toggle at all), the on/off switch for this one
        # stays in the UI -- an org can still opt back out, this just
        # changes what a *new* org (or one that hasn't touched this
        # setting yet) starts with. See
        # migrations/20260813120000_clustox_jira_incident_source_unconditional.sql
        # for the counterpart that brings already-saved settings rows for
        # existing orgs up to this same default.
        incident_sources = [
            IncidentSource.INCIDENT_SERVICE,
            IncidentSource.INCIDENT_TEAM,
            IncidentSource.GIT_REPO,
            IncidentSource.JIRA_ISSUE,
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
