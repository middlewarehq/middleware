from abc import ABC, abstractmethod
from typing import Any, Dict
from mhq.store.models.webhooks.webhooks import WebhookEvent


class WebhookEventHandler(ABC):
    @abstractmethod
    def validate_payload(self, payload: Dict[str, Any]):
        """
        Validates the incoming webhook event data before processing.
        """
        pass

    @abstractmethod
    def save_webhook_event(self, org_id: str, payload: Dict[str, Any]) -> str:
        """
        Saves the webhook event in database.
        """
        pass

    @abstractmethod
    def process_webhook_event(self, webhook_event: WebhookEvent):
        """
        Executes the main business logic for processing the webhook event.
        """
        pass

    @abstractmethod
    def prune_synced_data(self, webhook_event: WebhookEvent):
        """
        Prunes the synced data based on Interval.
        """
        pass
