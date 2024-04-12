from random import randint
from uuid import uuid4
from dora.service.deployments.models.models import (
    Deployment,
    DeploymentStatus,
    DeploymentType,
)
from dora.utils.string import uuid4_str

from dora.store.models.code import (
    PullRequestCommit,
    PullRequestEvent,
    PullRequestEventType,
    PullRequestState,
    PullRequest,
    RepoWorkflowRuns,
    RepoWorkflowRunsStatus,
)
from dora.utils.time import time_now


def get_pull_request(
    id=None,
    repo_id=None,
    number=None,
    author=None,
    state=None,
    title=None,
    head_branch=None,
    base_branch=None,
    provider=None,
    requested_reviews=None,
    data=None,
    state_changed_at=None,
    created_at=None,
    updated_at=None,
    meta=None,
    reviewers=None,
    first_commit_to_open=None,
    first_response_time=None,
    rework_time=None,
    merge_time=None,
    cycle_time=None,
    merge_to_deploy=None,
    lead_time=None,
):
    return PullRequest(
        id=id or uuid4(),
        repo_id=repo_id or uuid4(),
        number=number or randint(10, 100),
        author=author or "randomuser",
        title=title or "title",
        state=state or PullRequestState.OPEN,
        head_branch=head_branch or "feature",
        base_branch=base_branch or "main",
        provider=provider or "github",
        requested_reviews=requested_reviews or [],
        data=data or {},
        state_changed_at=state_changed_at or time_now(),
        created_at=created_at or time_now(),
        updated_at=updated_at or time_now(),
        first_commit_to_open=first_commit_to_open,
        first_response_time=first_response_time,
        rework_time=rework_time,
        merge_time=merge_time,
        cycle_time=cycle_time,
        merge_to_deploy=merge_to_deploy,
        lead_time=lead_time,
        reviewers=reviewers or ["randomuser1", "randomuser2"],
        meta=meta or {},
    )


def get_pull_request_event(
    id=None,
    pull_request_id=None,
    type=None,
    reviewer=None,
    state=None,
    created_at=None,
    idempotency_key=None,
    org_repo_id=None,
):
    return PullRequestEvent(
        id=id or uuid4(),
        pull_request_id=pull_request_id or uuid4(),
        type=type or PullRequestEventType.REVIEW.value,
        data={
            "user": {"login": reviewer or "User"},
            "state": state or "APPROVED",
            "author_association": "NONE",
        },
        created_at=created_at or time_now(),
        idempotency_key=idempotency_key or str(randint(10, 100)),
        org_repo_id=org_repo_id or uuid4(),
        actor_username=reviewer or "randomuser",
    )


def get_pull_request_commit(
    hash=None,
    pr_id=None,
    message=None,
    url=None,
    data=None,
    author=None,
    created_at=None,
    org_repo_id=None,
):
    return PullRequestCommit(
        hash=hash or uuid4(),
        pull_request_id=pr_id or uuid4(),
        message=message or "message",
        url=url or "https://abc.com",
        data=data or dict(),
        author=author or "randomuser",
        created_at=created_at or time_now(),
        org_repo_id=org_repo_id or uuid4(),
    )


def get_repo_workflow_run(
    id=None,
    repo_workflow_id=None,
    provider_workflow_run_id=None,
    event_actor=None,
    head_branch=None,
    status=None,
    conducted_at=None,
    created_at=None,
    updated_at=None,
    meta=None,
    duration=None,
    html_url=None,
):
    return RepoWorkflowRuns(
        id=id or uuid4(),
        repo_workflow_id=repo_workflow_id or uuid4(),
        provider_workflow_run_id=provider_workflow_run_id or "1234567",
        event_actor=event_actor or "samad-yar-khan",
        head_branch=head_branch or "master",
        status=status or RepoWorkflowRunsStatus.SUCCESS,
        conducted_at=conducted_at or time_now(),
        created_at=created_at or time_now(),
        updated_at=updated_at or time_now(),
        duration=duration,
        meta=meta,
        html_url=html_url,
    )


def get_deployment(
    repo_id=None,
    entity_id=None,
    actor=None,
    head_branch=None,
    status=None,
    conducted_at=None,
    meta=None,
    duration=None,
    html_url=None,
    provider=None,
):
    return Deployment(
        deployment_type=DeploymentType.WORKFLOW,
        repo_id=repo_id or "1234567",
        entity_id=entity_id or uuid4_str(),
        provider=provider or "github",
        actor=actor or "samad-yar-khan",
        head_branch=head_branch or "master",
        conducted_at=conducted_at or time_now(),
        duration=duration,
        status=status or DeploymentStatus.SUCCESS,
        html_url=html_url or "",
        meta=meta or {},
    )
