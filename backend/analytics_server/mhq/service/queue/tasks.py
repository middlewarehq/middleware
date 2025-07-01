from procrastinate_worker import app, flask_app
from mhq.service.queue.task_handlers.webhook_queue_handler import (
    get_webhook_queue_handler,
)


class WebhookQueue:
    @staticmethod
    @app.task(queue="webhookQueue", name="WebhookQueue.enqueue_webhook")
    def enqueue_webhook(webhook_event_id: str):
        with flask_app.app_context():
            webhook_queue_handler = get_webhook_queue_handler()
            webhook_queue_handler.webhook_receiver_handler(webhook_event_id)
