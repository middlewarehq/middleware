from mhq.service.events.factory import WebhookEventFactory
from mhq.service.events.event_service import (
    get_event_service,
    EventService,
)
import traceback


class WebhookQueueHandler:
    def __init__(self, event_service: EventService):
        self.event_service = event_service

    def handle(self, event_id: str):
        webhook_event = None
        try:
            webhook_event = self.event_service.get_event(event_id)
            if not webhook_event:
                raise Exception("Webhook payload not found in database.")
            webhook_event_factory = WebhookEventFactory()
            webhook_event_handler = webhook_event_factory(webhook_event.type)
            webhook_event_handler.process_webhook_event(webhook_event)

            webhook_event.error = None
            self.event_service.update_event(webhook_event)
        except Exception as e:
            if not webhook_event:
                raise e
            webhook_event.error = {
                "type": e.__class__.__name__,
                "message": str(e),
                "args": e.args,
                "traceback": traceback.format_exc(),
            }
            self.event_service.update_event(webhook_event)
            raise e


def get_webhook_queue_handler():
    return WebhookQueueHandler(event_service=get_event_service())
