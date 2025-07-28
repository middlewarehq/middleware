from flask import Blueprint, request
from typing import Any, Dict, List
from mhq.api.request_utils import wrap_webhook_exceptions
from mhq.exceptions.webhook import InvalidEventTypeError
from mhq.service.query_validator import get_query_validator
from mhq.store.models.events.enums import EventType, WEBHOOK_EVENTS
from mhq.service.events.factory import WebhookEventFactory
from mhq.service.queue.tasks import WebhookQueue

app = Blueprint("webhooks", __name__)


@app.route("/public/webhook/<event_type>", methods={"POST"})
@wrap_webhook_exceptions
def receive_webhook_workflows(event_type: str):

    if event_type not in WEBHOOK_EVENTS:
        raise InvalidEventTypeError(event_type)

    event_type = EventType(event_type)
    api_key = request.headers.get("X-API-KEY")

    query_validator = get_query_validator()
    default_org = query_validator.get_default_org()
    org_id = str(default_org.id)
    query_validator.api_key_validator(api_key, org_id)

    webhook_event_factory = WebhookEventFactory()
    webhook_service = webhook_event_factory(event_type)

    payload: Dict[str, List[Any]] = request.get_json()
    webhook_service.validate_payload(payload)
    event_id = webhook_service.save_webhook_event(org_id, payload)

    job_id = WebhookQueue.enqueue_webhook.defer(event_id=str(event_id))

    return {"message": "Job enqueued successfully", "job_id": job_id}, 200
