from enum import Enum


class EventType(Enum):
    WORKFLOW = "workflow"
    INCIDENT = "incident"


class EventSource(Enum):
    WEBHOOK = "webhook"
    SYSTEM = "system"
    USER = "user"


WEBHOOK_EVENTS = [
    EventType.WORKFLOW.value,
    EventType.INCIDENT.value,
]
