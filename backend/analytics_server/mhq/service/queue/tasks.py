from procrastinate_worker import app, flask_app
from mhq.service.queue.task_handlers.webhook_queue_handler import (
    get_webhook_queue_handler,
    retry,
)
from procrastinate import JobContext


class WebhookQueue:
    @staticmethod
    @app.task(
        queue="webhookQueue",
        name="WebhookQueue.enqueue_webhook",
        pass_context=True,
        retry=retry,
    )
    def enqueue_webhook(job_context: JobContext, event_id: str):
        with flask_app.app_context():
            webhook_queue_handler = get_webhook_queue_handler()
            webhook_queue_handler.handle(event_id, job_context.job)


class CronJobQueue:
    @staticmethod
    @app.periodic(cron="0 */6 * * *")  # Every 6 hours
    @app.task(queue="cronJobQueue", name="CronJobQueue.retry_stalled_jobs")
    async def retry_stalled_jobs():
        stalled_jobs = await app.job_manager.get_stalled_jobs()
        for job in stalled_jobs:
            await app.job_manager.retry_job(job)

