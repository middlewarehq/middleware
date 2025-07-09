from mhq.store.models.webhooks.webhooks import WebhookEvent
from mhq.store import db, rollback_on_exc
from typing import Optional


class WebhooksRepoService:
    def __init__(self):
        self._db = db

    def get_webhook_event(self, webhook_event_id: str) -> Optional[WebhookEvent]:
        return self._db.session.get(WebhookEvent, webhook_event_id)

    @rollback_on_exc
    def create_webhook_event(self, webhook_event: WebhookEvent) -> str:
        self._db.session.add(webhook_event)
        self._db.session.commit()
        return webhook_event.id

    @rollback_on_exc
    def update_webhook_event(self, webhook_event: WebhookEvent):
        self._db.session.merge(webhook_event)
        self._db.session.commit()
