from mhq.service.events.factory import WebhookEventFactory
from mhq.service.events.event_service import (
    get_event_service,
    EventService,
)
from procrastinate import jobs, RetryStrategy
from mhq.utils.log import LOG
import traceback


# total_wait = wait + lineal_wait * attempts + exponential_wait ** (attempts + 1)
MAX_RETRIES = 2
WAIT = 60
LINEAR_WAIT = 540
NEXT_ATTEMPT_TIME = [60, 600]  # 1min, 10min

retry = RetryStrategy(max_attempts=MAX_RETRIES, wait=WAIT, linear_wait=LINEAR_WAIT)


class WebhookQueueHandler:
    def __init__(self, event_service: EventService):
        self.event_service = event_service

    def handle(self, event_id: str, job: jobs.Job):
        webhook_event = None
        try:
            webhook_event = self.event_service.get_event(event_id)
            if not webhook_event:
                raise Exception("Webhook payload not found in database.")
            webhook_event_factory = WebhookEventFactory()
            webhook_event_handler = webhook_event_factory(webhook_event.type)
            webhook_event_handler.process_webhook_event(webhook_event)

            webhook_event.error = None
            self.event_service.update_event(webhook_event)
        except Exception as e:
            if not webhook_event:
                raise e
            webhook_event.error = {
                "type": e.__class__.__name__,
                "message": str(e),
                "args": e.args,
                "traceback": traceback.format_exc(),
            }
            self.event_service.update_event(webhook_event)

            if job.attempts < len(NEXT_ATTEMPT_TIME):
                next_attempt_minutes = int(NEXT_ATTEMPT_TIME[job.attempts] / 60)
                time_unit = "minute" if next_attempt_minutes == 1 else "minutes"
                LOG.info(
                    f"Job got failed. It will be retried in {next_attempt_minutes} {time_unit}."
                )
            elif job.attempts == len(NEXT_ATTEMPT_TIME):
                LOG.info(
                    f"Job has reached the maximum of {MAX_RETRIES + 1} attempts and is now marked as permanently failed. No further retries will be made."
                )

            raise e


def get_webhook_queue_handler():
    return WebhookQueueHandler(event_service=get_event_service())
