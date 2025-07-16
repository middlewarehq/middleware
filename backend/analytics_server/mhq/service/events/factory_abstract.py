from abc import ABC, abstractmethod
from typing import Any, Dict
from mhq.store.models.events.events import Event


class WebhookEventHandler(ABC):
    @abstractmethod
    def validate_payload(self, payload: Dict[str, Any]):
        """
        Validates the incoming webhook event data before processing.
        """

    @abstractmethod
    def save_webhook_event(self, org_id: str, payload: Dict[str, Any]) -> str:
        """
        Saves the webhook event in database.
        """

    @abstractmethod
    def process_webhook_event(self, webhook_event: Event):
        """
        Executes the main business logic for processing the webhook event.
        """

    @abstractmethod
    def prune_synced_data(self, webhook_event: Event):
        """
        Prunes the synced data based on Interval.
        """
