from datetime import timedelta
from dora.service.incidents.incidents import get_incident_service
from dora.utils.time import time_now

from tests.factories.models import get_incident, get_repo_workflow_run


# No incidents, no deployments
def test_get_deployment_incidents_count_map_returns_empty_dict_when_given_no_incidents_no_deployments():
    incident_service = get_incident_service()
    incidents = []
    deployments = []
    deployment_incidents_count_map = incident_service.get_deployment_incidents_map(
        deployments,
        incidents,
    )
    assert deployment_incidents_count_map == {}


# No incidents, some deployments
def test_get_deployment_incidents_count_map_returns_deployment_incident_count_map_when_given_no_incidents_some_deployments():
    incident_service = get_incident_service()
    incidents = []
    deployments = [
        get_repo_workflow_run(conducted_at=time_now() - timedelta(days=2)),
        get_repo_workflow_run(conducted_at=time_now() - timedelta(hours=6)),
    ]
    deployment_incidents_count_map = incident_service.get_deployment_incidents_map(
        deployments,
        incidents,
    )
    assert deployment_incidents_count_map == {deployments[0]: [], deployments[1]: []}


# Some incidents, no deployments
def test_get_deployment_incidents_count_map_returns_empty_dict_when_given_some_incidents_no_deployments():
    incident_service = get_incident_service()
    incidents = [get_incident(creation_date=time_now() - timedelta(days=3))]
    deployments = []
    deployment_incidents_count_map = incident_service.get_deployment_incidents_map(
        deployments, incidents
    )
    assert deployment_incidents_count_map == {}


# One incident between two deployments
def test_get_deployment_incidents_count_map_returns_deployment_incident_count_map_when_given_one_incidents_bw_two_deployments():
    incident_service = get_incident_service()
    incidents = [get_incident(creation_date=time_now() - timedelta(days=1))]
    deployments = [
        get_repo_workflow_run(conducted_at=time_now() - timedelta(days=2)),
        get_repo_workflow_run(conducted_at=time_now() - timedelta(hours=6)),
    ]
    deployment_incidents_count_map = incident_service.get_deployment_incidents_map(
        deployments, incidents
    )
    assert deployment_incidents_count_map == {
        deployments[0]: [incidents[0]],
        deployments[1]: [],
    }


# One incident before two deployments
def test_get_deployment_incidents_count_map_returns_deployment_incident_count_map_when_given_one_incidents_bef_two_deployments():
    incident_service = get_incident_service()
    incidents = [get_incident(creation_date=time_now() - timedelta(days=3))]
    deployments = [
        get_repo_workflow_run(conducted_at=time_now() - timedelta(days=2)),
        get_repo_workflow_run(conducted_at=time_now() - timedelta(hours=6)),
    ]
    deployment_incidents_count_map = incident_service.get_deployment_incidents_map(
        deployments, incidents
    )
    assert deployment_incidents_count_map == {deployments[0]: [], deployments[1]: []}


# One incident after two deployments
def test_get_deployment_incidents_count_map_returns_deployment_incident_count_map_when_given_one_incidents_after_two_deployments():
    incident_service = get_incident_service()
    incidents = [get_incident(creation_date=time_now() - timedelta(hours=1))]
    deployments = [
        get_repo_workflow_run(conducted_at=time_now() - timedelta(days=2)),
        get_repo_workflow_run(conducted_at=time_now() - timedelta(hours=6)),
    ]
    deployment_incidents_count_map = incident_service.get_deployment_incidents_map(
        deployments, incidents
    )
    assert deployment_incidents_count_map == {
        deployments[0]: [],
        deployments[1]: [incidents[0]],
    }


# Multiple incidents and deployments
def test_get_deployment_incidents_count_map_returns_deployment_incident_count_map_when_given_multi_incidents_multi_deployments():
    incident_service = get_incident_service()
    incidents = [
        get_incident(creation_date=time_now() - timedelta(days=5)),
        get_incident(creation_date=time_now() - timedelta(days=3)),
        get_incident(creation_date=time_now() - timedelta(hours=20)),
        get_incident(creation_date=time_now() - timedelta(hours=1)),
    ]
    deployments = [
        get_repo_workflow_run(conducted_at=time_now() - timedelta(days=7)),
        get_repo_workflow_run(conducted_at=time_now() - timedelta(days=6)),
        get_repo_workflow_run(conducted_at=time_now() - timedelta(days=4)),
        get_repo_workflow_run(conducted_at=time_now() - timedelta(days=2)),
        get_repo_workflow_run(conducted_at=time_now() - timedelta(hours=6)),
    ]
    deployment_incidents_count_map = incident_service.get_deployment_incidents_map(
        deployments, incidents
    )
    assert deployment_incidents_count_map == {
        deployments[0]: [],
        deployments[1]: [incidents[0]],
        deployments[2]: [incidents[1]],
        deployments[3]: [incidents[2]],
        deployments[4]: [incidents[3]],
    }
