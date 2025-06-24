from mhq.service.webhooks.factory_abstract import WebhookEventHandler
from mhq.store.models.webhooks.enums import WebhookEventRequestType
from mhq.service.webhooks.webhook_workflow_handler import get_webhook_workflow_handler


class WebhookEventFactory:
    def __call__(self, request_type: WebhookEventRequestType) -> WebhookEventHandler:
        if request_type == WebhookEventRequestType.WORKFLOW:
            return get_webhook_workflow_handler()

        raise NotImplementedError(f"Unknown request type - {request_type}")
