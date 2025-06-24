from mhq.store.models.webhooks.webhooks import WebhookEvent
from mhq.store.repos.webhooks import WebhooksRepoService
from typing import Optional


class WebhookEventService:
    def __init__(self, webhook_repo_service: WebhooksRepoService):
        self._webhook_repo_service: WebhooksRepoService = webhook_repo_service

    def get_webhook_event(self, webhook_event_id: str) -> Optional[WebhookEvent]:
        return self._webhook_repo_service.get_webhook_event(webhook_event_id)

    def create_webhook_event(self, webhook_event: WebhookEvent) -> str:
        return self._webhook_repo_service.create_webhook_event(webhook_event)

    def update_webhook_event(self, webhook_event: WebhookEvent):
        return self._webhook_repo_service.update_webhook_event(webhook_event)


def get_webhook_service():
    return WebhookEventService(webhook_repo_service=WebhooksRepoService())
