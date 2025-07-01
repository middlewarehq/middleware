from flask import Blueprint, request
from typing import Any, Dict, List
from mhq.service.query_validator import get_query_validator
from mhq.store.models.webhooks.enums import WebhookEventRequestType
from mhq.service.webhooks.factory import WebhookEventFactory
from mhq.service.queue.tasks import WebhookQueue

app = Blueprint("webhooks", __name__)


@app.route("/public/webhook/<event_type>", methods={"POST"})
def receive_webhook_workflows(event_type: str):
    webhook_event_type = WebhookEventRequestType(event_type)
    secret_key = request.headers.get("X-API-KEY")

    query_validator = get_query_validator()
    default_org = query_validator.get_default_org()
    org_id = str(default_org.id)
    query_validator.api_key_validator(secret_key, org_id)

    webhook_event_factory = WebhookEventFactory()
    webhook_service = webhook_event_factory(webhook_event_type)

    payload: Dict[str, List[Any]] = request.get_json()
    webhook_service.validate_payload(payload)
    webhook_event_id = webhook_service.save_webhook_event(org_id, payload)

    job_id = WebhookQueue.enqueue_webhook.defer(webhook_event_id=str(webhook_event_id))

    return {"message": "Job enqueued successfully", "job_id": job_id}, 200
