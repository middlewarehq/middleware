from datetime import timedelta
from tests.factories.models.incidents import get_change_failure_rate_metrics
from dora.service.incidents.incidents import get_incident_service
from dora.utils.time import time_now

from tests.factories.models import get_incident, get_deployment


# No incidents, no deployments
def test_get_change_failure_rate_for_no_incidents_no_deployments():
    incident_service = get_incident_service()
    incidents = []
    deployments = []
    change_failure_rate = incident_service.get_change_failure_rate_metrics(
        deployments,
        incidents,
    )
    assert change_failure_rate == get_change_failure_rate_metrics([], [])
    assert change_failure_rate.change_failure_rate == 0


# No incidents, some deployments
def test_get_change_failure_rate_for_no_incidents_and_some_deployments():
    incident_service = get_incident_service()
    incidents = []

    deployment_1 = get_deployment(conducted_at=time_now() - timedelta(days=2))
    deployment_2 = get_deployment(conducted_at=time_now() - timedelta(hours=6))

    deployments = [
        deployment_1,
        deployment_2,
    ]
    change_failure_rate = incident_service.get_change_failure_rate_metrics(
        deployments,
        incidents,
    )
    assert change_failure_rate == get_change_failure_rate_metrics(
        set(), set([deployment_2, deployment_1])
    )
    assert change_failure_rate.change_failure_rate == 0


# Some incidents, no deployments
def test_get_deployment_incidents_count_map_returns_empty_dict_when_given_some_incidents_no_deployments():
    incident_service = get_incident_service()
    incidents = [get_incident(creation_date=time_now() - timedelta(days=3))]
    deployments = []
    change_failure_rate = incident_service.get_change_failure_rate_metrics(
        deployments,
        incidents,
    )
    assert change_failure_rate == get_change_failure_rate_metrics(set(), set())
    assert change_failure_rate.change_failure_rate == 0


# One incident between two deployments
def test_get_change_failure_rate_for_one_incidents_bw_two_deployments():
    incident_service = get_incident_service()
    incidents = [get_incident(creation_date=time_now() - timedelta(days=1))]

    deployment_1 = get_deployment(conducted_at=time_now() - timedelta(days=2))
    deployment_2 = get_deployment(conducted_at=time_now() - timedelta(hours=6))

    deployments = [
        deployment_1,
        deployment_2,
    ]

    change_failure_rate = incident_service.get_change_failure_rate_metrics(
        deployments,
        incidents,
    )
    assert change_failure_rate == get_change_failure_rate_metrics(
        set([deployment_1]), set([deployment_2, deployment_1])
    )
    assert change_failure_rate.change_failure_rate == 50


# One incident before two deployments
def test_get_change_failure_rate_for_one_incidents_bef_two_deployments():
    incident_service = get_incident_service()
    incidents = [get_incident(creation_date=time_now() - timedelta(days=3))]

    deployment_1 = get_deployment(conducted_at=time_now() - timedelta(days=2))
    deployment_2 = get_deployment(conducted_at=time_now() - timedelta(hours=6))

    deployments = [
        deployment_1,
        deployment_2,
    ]

    change_failure_rate = incident_service.get_change_failure_rate_metrics(
        deployments,
        incidents,
    )
    assert change_failure_rate == get_change_failure_rate_metrics(
        set([]), set([deployment_2, deployment_1])
    )
    assert change_failure_rate.change_failure_rate == 0


# One incident after two deployments
def test_get_change_failure_rate_for_one_incidents_after_two_deployments():
    incident_service = get_incident_service()
    incidents = [get_incident(creation_date=time_now() - timedelta(hours=1))]
    deployment_1 = get_deployment(conducted_at=time_now() - timedelta(days=2))
    deployment_2 = get_deployment(conducted_at=time_now() - timedelta(hours=6))

    deployments = [
        deployment_1,
        deployment_2,
    ]

    change_failure_rate = incident_service.get_change_failure_rate_metrics(
        deployments,
        incidents,
    )
    assert change_failure_rate == get_change_failure_rate_metrics(
        set([deployment_2]), set([deployment_2, deployment_1])
    )
    assert change_failure_rate.change_failure_rate == 50


# Multiple incidents and deployments
def test_get_change_failure_rate_for_multi_incidents_multi_deployments():
    """
    Time Line:

    incident_0
    deployment1
    deployment_2
    incident_1
    deployment_3
    incident_2
    deployment_4
    incident_3
    deployment_5
    incident_4
    incident_5
    incident_6
    deployment_6

    """

    incident_service = get_incident_service()

    incident_0 = get_incident(creation_date=time_now() - timedelta(days=10))
    incident_1 = get_incident(creation_date=time_now() - timedelta(days=5))
    incident_2 = get_incident(creation_date=time_now() - timedelta(days=3))
    incident_3 = get_incident(creation_date=time_now() - timedelta(hours=20))
    incident_4 = get_incident(creation_date=time_now() - timedelta(hours=4))
    incident_5 = get_incident(creation_date=time_now() - timedelta(hours=2))
    incident_6 = get_incident(creation_date=time_now() - timedelta(hours=1))

    incidents = [
        incident_0,
        incident_1,
        incident_2,
        incident_3,
        incident_4,
        incident_5,
        incident_6,
    ]

    deployment_1 = get_deployment(conducted_at=time_now() - timedelta(days=7))
    deployment_2 = get_deployment(conducted_at=time_now() - timedelta(days=6))
    deployment_3 = get_deployment(conducted_at=time_now() - timedelta(days=4))
    deployment_4 = get_deployment(conducted_at=time_now() - timedelta(days=2))
    deployment_5 = get_deployment(conducted_at=time_now() - timedelta(hours=6))
    deployment_6 = get_deployment(conducted_at=time_now() - timedelta(minutes=30))

    deployments = [
        deployment_1,
        deployment_2,
        deployment_3,
        deployment_4,
        deployment_5,
        deployment_6,
    ]

    change_failure_rate = incident_service.get_change_failure_rate_metrics(
        deployments,
        incidents,
    )

    assert change_failure_rate == get_change_failure_rate_metrics(
        set([deployment_2, deployment_3, deployment_4, deployment_5]),
        set(
            [
                deployment_1,
                deployment_2,
                deployment_3,
                deployment_4,
                deployment_5,
                deployment_6,
            ]
        ),
    )
    assert change_failure_rate.change_failure_rate == (4 / 6 * 100)
