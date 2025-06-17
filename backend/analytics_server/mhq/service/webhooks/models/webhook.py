from dataclasses import dataclass
from datetime import datetime
from typing import Optional, List
from mhq.store.models.code.workflows.enums import RepoWorkflowRunsStatus
from mhq.exceptions.webhook import InvalidPayloadError


@dataclass
class WebhookWorkflowRun:
    workflow_name: str
    repo_urls: List[str]
    event_actor: str
    head_branch: str
    workflow_run_unique_id: str
    status: RepoWorkflowRunsStatus
    workflow_run_conducted_at: datetime
    duration: Optional[int] = None
    html_url: Optional[str] = None

    def __post_init__(self):
        optional_fields = {"duration", "html_url"}
        all_fields = set(self.__dataclass_fields__.keys())
        required_fields = all_fields - optional_fields

        for field in required_fields:
            if getattr(self, field) is None:
                error_message = f"Workflow run missing required field: '{field}'"
                raise InvalidPayloadError(error_message)

        try:
            self.workflow_run_conducted_at = datetime.fromisoformat(
                self.workflow_run_conducted_at
            )
        except Exception as e:
            raise InvalidPayloadError(
                "Invalid datetime format for workflow_run_conducted_at"
            )
