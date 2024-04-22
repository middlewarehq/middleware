from enum import Enum


class IncidentProvider(Enum):
    GITHUB = "github"


class IncidentSource(Enum):
    INCIDENT_SERVICE = "INCIDENT_SERVICE"
    INCIDENT_TEAM = "INCIDENT_TEAM"
    GIT_REPO = "GIT_REPO"


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


class IncidentBookmarkType(Enum):
    SERVICE = "SERVICE"
