from mhq.exapi.models.git_incidents import RevertPRMap
from mhq.service.incidents.sync.etl_git_incidents_handler import GitIncidentsETLHandler
from mhq.store.models.incidents import IncidentType, IncidentStatus
from mhq.utils.string import uuid4_str
from mhq.utils.time import time_now
from tests.factories.models import get_incident
from tests.factories.models.code import get_pull_request
from tests.factories.models.incidents import (
    get_org_incident_service,
    get_incident_org_incident_map,
)
from tests.utilities import compare_objects_as_dicts

org_id = uuid4_str()
repo_id = uuid4_str()
provider = "github"

original_pr = get_pull_request(
    id=uuid4_str(),
    title="Testing PR",
    repo_id=repo_id,
    head_branch="feature",
    base_branch="main",
    provider=provider,
)

revert_pr = get_pull_request(
    id=uuid4_str(),
    title='Revert "Testing PR"',
    repo_id=repo_id,
    head_branch="revert-feature",
    base_branch="main",
    provider=provider,
)

expected_git_incident = get_incident(
    id=uuid4_str(),
    provider=provider,
    key=str(original_pr.id),
    title=original_pr.title,
    incident_number=int(original_pr.number),
    status=IncidentStatus.RESOLVED.value,
    creation_date=original_pr.state_changed_at,
    acknowledged_date=revert_pr.created_at,
    resolved_date=revert_pr.state_changed_at,
    assigned_to=revert_pr.author,
    assignees=[revert_pr.author],
    url=revert_pr.url,
    meta={
        "revert_pr": GitIncidentsETLHandler._adapt_pr_to_json(revert_pr),
        "original_pr": GitIncidentsETLHandler._adapt_pr_to_json(original_pr),
        "created_at": revert_pr.created_at.isoformat(),
        "updated_at": revert_pr.updated_at.isoformat(),
    },
    created_at=time_now(),
    updated_at=time_now(),
    incident_type=IncidentType.REVERT_PR,
)


def test_process_revert_pr_incident_given_existing_incident_map_returns_same_incident():
    class FakeIncidentsRepoService:
        def get_incident_by_key_type_and_provider(
            self,
            *args,
            **kwargs,
        ):
            return expected_git_incident

    git_incident_service = GitIncidentsETLHandler(
        org_id, None, FakeIncidentsRepoService()
    )

    org_incident_service = get_org_incident_service(
        provider="github", service_id=repo_id
    )

    revert_pr_map = RevertPRMap(
        original_pr=original_pr,
        revert_pr=revert_pr,
        created_at=time_now(),
        updated_at=time_now(),
    )

    incident, incident_service_map = git_incident_service._process_revert_pr_incident(
        org_incident_service, revert_pr_map
    )

    expected_incident_org_incident_service_map = get_incident_org_incident_map(
        expected_git_incident.id, service_id=repo_id
    )

    assert compare_objects_as_dicts(
        expected_git_incident, incident, ["created_at", "updated_at"]
    )

    assert compare_objects_as_dicts(
        expected_incident_org_incident_service_map, incident_service_map
    )


def test_process_revert_pr_incident_given_no_existing_incident_map_returns_new_incident():
    class FakeIncidentsRepoService:
        def get_incident_by_key_type_and_provider(
            self,
            *args,
            **kwargs,
        ):
            return None

    git_incident_service = GitIncidentsETLHandler(
        org_id, None, FakeIncidentsRepoService()
    )

    org_incident_service = get_org_incident_service(
        provider="github", service_id=repo_id
    )

    revert_pr_map = RevertPRMap(
        original_pr=original_pr,
        revert_pr=revert_pr,
        created_at=time_now(),
        updated_at=time_now(),
    )

    incident, incident_service_map = git_incident_service._process_revert_pr_incident(
        org_incident_service, revert_pr_map
    )

    assert compare_objects_as_dicts(
        expected_git_incident, incident, ["id", "created_at", "updated_at"]
    )

    expected_incident_org_incident_service_map = get_incident_org_incident_map(
        uuid4_str(), service_id=repo_id
    )

    assert compare_objects_as_dicts(
        expected_incident_org_incident_service_map,
        incident_service_map,
        ["incident_id"],
    )
