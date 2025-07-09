from mhq.store.models.events.events import Event
from mhq.store.repos.events import EventsRepoService
from typing import Optional


class EventService:
    def __init__(self, event_repo_service: EventsRepoService):
        self._event_repo_service: EventsRepoService = event_repo_service

    def get_event(self, event_id: str) -> Optional[Event]:
        return self._event_repo_service.get_event(event_id)

    def create_event(self, event: Event) -> str:
        return self._event_repo_service.create_event(event)

    def update_event(self, event: Event):
        return self._event_repo_service.update_event(event)


def get_event_service():
    return EventService(event_repo_service=EventsRepoService())
