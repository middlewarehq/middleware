from enum import Enum
from mhq.exceptions.webhook import InvalidEventTypeError


class WebhookEventRequestType(Enum):
    WORKFLOW = "workflow"
    INCIDENT = "incident"

    @classmethod
    def _missing_(cls, value):
        """Called when an invalid value is provided"""
        raise InvalidEventTypeError(str(value))
