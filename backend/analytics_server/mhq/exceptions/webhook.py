# Base exception class for webhook-related errors
class WebhookException(Exception):
    def __init__(self, message: str, resolution: str):
        self.message = message
        self.resolution = resolution
        super().__init__(self.message)


class InvalidApiKeyError(WebhookException):
    def __init__(self):
        super().__init__(
            message="Invalid or missing API key",
            resolution=(
                "Ensure you are passing the correct API key in the `X-API-KEY` header. "
                "To generate a new key, navigate to Manage Integrations → Webhook → Setup."
            ),
        )


class PayloadLimitExceededError(WebhookException):
    def __init__(self):
        super().__init__(
            message="Payload exceeds the allowed size limit.",
            resolution="Only a maximum of 500 records is allowed per request.",
        )


class InvalidPayloadError(WebhookException):
    def __init__(self, message: str = "Invalid JSON payload received."):
        super().__init__(
            message=message,
            resolution=(
                "Please ensure your payload follows the correct format. "
                "You can review the expected structure under Manage Integrations → Webhook → Setup."
            ),
        )


class InvalidEventTypeError(WebhookException):
    def __init__(self, event_type: str):
        super().__init__(
            message=f"Invalid webhook event type received: '{event_type}'",
            resolution="Ensure the URL path ends with either `/workflow` or `/incident`",
        )
