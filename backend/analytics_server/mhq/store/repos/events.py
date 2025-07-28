from mhq.store.models.events.events import Event
from mhq.store import db, rollback_on_exc
from typing import Optional


class EventsRepoService:
    def __init__(self):
        self._db = db

    def get_event(self, event_id: str) -> Optional[Event]:
        return self._db.session.get(Event, event_id)

    @rollback_on_exc
    def create_event(self, event: Event) -> str:
        self._db.session.add(event)
        self._db.session.commit()
        return event.id

    @rollback_on_exc
    def update_event(self, event: Event):
        self._db.session.merge(event)
        self._db.session.commit()
