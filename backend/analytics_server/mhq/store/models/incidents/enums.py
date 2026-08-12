from enum import Enum


class IncidentProvider(Enum):
    GITHUB = "github"
    GITLAB = "gitlab"
    # CLUSTOX: Jira issues (of a configurable issue type) as an incident
    # source for Change Failure Rate / MTTR -- see
    # docs/JIRA_INTEGRATION_PROPOSAL.md.
    JIRA = "jira"


class IncidentSource(Enum):
    INCIDENT_SERVICE = "INCIDENT_SERVICE"
    INCIDENT_TEAM = "INCIDENT_TEAM"
    GIT_REPO = "GIT_REPO"
    # CLUSTOX: opt-in only -- see default_settings_data.py's explicit
    # INCIDENT_SOURCES_SETTING default, which deliberately does NOT
    # include this so existing orgs aren't silently affected.
    JIRA_ISSUE = "JIRA_ISSUE"


class ServiceStatus(Enum):
    DISABLED = "disabled"
    ACTIVE = "active"
    WARNING = "warning"
    CRITICAL = "critical"
    MAINTENANCE = "maintenance"


class IncidentStatus(Enum):
    TRIGGERED = "triggered"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"


class IncidentType(Enum):
    INCIDENT = "INCIDENT"
    REVERT_PR = "REVERT_PR"
    ALERT = "ALERT"
    # CLUSTOX: a Ticket (of a configured Jira issue type) synced as an
    # Incident -- see JiraIncidentsETLHandler.
    JIRA_ISSUE = "JIRA_ISSUE"


class IncidentBookmarkType(Enum):
    SERVICE = "SERVICE"
