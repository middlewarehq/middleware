from mhq.service.events.factory_abstract import WebhookEventHandler
from mhq.store.models.events.enums import EventType
from mhq.service.events.webhook_workflow_handler import get_webhook_workflow_handler


class WebhookEventFactory:
    def __call__(self, event_type: EventType) -> WebhookEventHandler:
        if event_type == EventType.WORKFLOW:
            return get_webhook_workflow_handler()

        raise NotImplementedError(f"Unknown event type - {event_type}")
