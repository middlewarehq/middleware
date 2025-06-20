from mhq.service.webhooks.factory import WebhookEventFactory
from mhq.service.webhooks.webhook_event_service import (
    get_webhook_service,
    WebhookEventService,
)


class WebhookQueueHandler:
    def __init__(self, webhooks_service: WebhookEventService):
        self.webhooks_service = webhooks_service

    def webhook_receiver_handler(self, webhook_event_id: str):
        webhook_event = None
        try:
            webhook_event = self.webhooks_service.get_webhook_event(webhook_event_id)
            if not webhook_event:
                raise Exception("Webhook payload not found in database.")
            webhook_event_factory = WebhookEventFactory()
            webhook_event_handler = webhook_event_factory(webhook_event.request_type)
            webhook_event_handler.process_webhook_event(webhook_event)

            webhook_event.error = None
            self.webhooks_service.update_webhook_event(webhook_event)
        except Exception as e:
            if not webhook_event:
                raise e
            webhook_event.error = {"error": str(e)}
            self.webhooks_service.update_webhook_event(webhook_event)


def get_webhook_queue_handler():
    return WebhookQueueHandler(webhooks_service=get_webhook_service())
