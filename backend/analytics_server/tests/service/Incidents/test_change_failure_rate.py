import pytz
from datetime import datetime
from datetime import timedelta
from tests.factories.models.incidents import get_change_failure_rate_metrics
from dora.service.incidents.incidents import get_incident_service
from dora.utils.time import Interval, time_now

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

    incident_service = get_incident_service()

    incident_0 = get_incident(creation_date=time_now() - timedelta(days=10))

    deployment_1 = get_deployment(conducted_at=time_now() - timedelta(days=7))

    deployment_2 = get_deployment(conducted_at=time_now() - timedelta(days=6))
    incident_1 = get_incident(creation_date=time_now() - timedelta(days=5))

    deployment_3 = get_deployment(conducted_at=time_now() - timedelta(days=4))
    incident_2 = get_incident(creation_date=time_now() - timedelta(days=3))

    deployment_4 = get_deployment(conducted_at=time_now() - timedelta(days=2))
    incident_3 = get_incident(creation_date=time_now() - timedelta(hours=20))

    deployment_5 = get_deployment(conducted_at=time_now() - timedelta(hours=6))
    incident_4 = get_incident(creation_date=time_now() - timedelta(hours=4))
    incident_5 = get_incident(creation_date=time_now() - timedelta(hours=2))
    incident_6 = get_incident(creation_date=time_now() - timedelta(hours=1))

    deployment_6 = get_deployment(conducted_at=time_now() - timedelta(minutes=30))

    incidents = [
        incident_0,
        incident_1,
        incident_2,
        incident_3,
        incident_4,
        incident_5,
        incident_6,
    ]

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


# No Incidents and Deployments
def test_get_weekly_change_failure_rate_for_no_incidents_no_deployments():

    first_week_2024 = datetime(2024, 1, 1, 0, 0, 0, tzinfo=pytz.UTC)
    second_week_2024 = datetime(2024, 1, 8, 0, 0, 0, tzinfo=pytz.UTC)
    third_week_2024 = datetime(2024, 1, 15, 0, 0, 0, tzinfo=pytz.UTC)

    from_time = first_week_2024 + timedelta(days=1)
    to_time = third_week_2024 + timedelta(days=2)

    incidents = []
    deployments = []

    incident_service = get_incident_service()
    weekly_change_failure_rate = incident_service.get_weekly_change_failure_rate(
        Interval(from_time, to_time),
        deployments,
        incidents,
    )
    assert weekly_change_failure_rate == {
        first_week_2024: get_change_failure_rate_metrics([], []),
        second_week_2024: get_change_failure_rate_metrics([], []),
        third_week_2024: get_change_failure_rate_metrics([], []),
    }


# No Incidents and Deployments
def test_get_weekly_change_failure_rate_for_no_incidents_and_some_deployments():

    first_week_2024 = datetime(2024, 1, 1, 0, 0, 0, tzinfo=pytz.UTC)
    second_week_2024 = datetime(2024, 1, 8, 0, 0, 0, tzinfo=pytz.UTC)
    third_week_2024 = datetime(2024, 1, 15, 0, 0, 0, tzinfo=pytz.UTC)

    from_time = first_week_2024 + timedelta(days=1)
    to_time = third_week_2024 + timedelta(days=2)

    deployment_1 = get_deployment(conducted_at=from_time + timedelta(days=2))
    deployment_2 = get_deployment(conducted_at=second_week_2024 + timedelta(days=2))
    deployment_3 = get_deployment(conducted_at=to_time - timedelta(hours=2))

    deployments = [deployment_1, deployment_2, deployment_3]

    incidents = []

    incident_service = get_incident_service()
    weekly_change_failure_rate = incident_service.get_weekly_change_failure_rate(
        Interval(from_time, to_time),
        deployments,
        incidents,
    )

    assert weekly_change_failure_rate == {
        first_week_2024: get_change_failure_rate_metrics([], set([deployment_1])),
        second_week_2024: get_change_failure_rate_metrics([], set([deployment_2])),
        third_week_2024: get_change_failure_rate_metrics([], set([deployment_3])),
    }


# No Incidents and Deployments
def test_get_weekly_change_failure_rate_for_incidents_and_no_deployments():

    first_week_2024 = datetime(2024, 1, 1, 0, 0, 0, tzinfo=pytz.UTC)
    second_week_2024 = datetime(2024, 1, 8, 0, 0, 0, tzinfo=pytz.UTC)
    third_week_2024 = datetime(2024, 1, 15, 0, 0, 0, tzinfo=pytz.UTC)

    from_time = first_week_2024 + timedelta(days=1)
    to_time = third_week_2024 + timedelta(days=2)

    incident_1 = get_incident(creation_date=to_time - timedelta(days=14))
    incident_2 = get_incident(creation_date=to_time - timedelta(days=10))
    incident_3 = get_incident(creation_date=to_time - timedelta(days=7))
    incident_4 = get_incident(creation_date=to_time - timedelta(days=3))
    incident_5 = get_incident(creation_date=to_time - timedelta(hours=2))
    incident_6 = get_incident(creation_date=to_time - timedelta(hours=1))

    incidents = [incident_1, incident_2, incident_3, incident_4, incident_5, incident_6]
    deployments = []

    incident_service = get_incident_service()
    weekly_change_failure_rate = incident_service.get_weekly_change_failure_rate(
        Interval(from_time, to_time),
        deployments,
        incidents,
    )

    assert weekly_change_failure_rate == {
        first_week_2024: get_change_failure_rate_metrics([], []),
        second_week_2024: get_change_failure_rate_metrics([], []),
        third_week_2024: get_change_failure_rate_metrics([], []),
    }


def test_get_weekly_change_failure_rate_for_incidents_and_deployments():

    first_week_2024 = datetime(2024, 1, 1, 0, 0, 0, tzinfo=pytz.UTC)
    second_week_2024 = datetime(2024, 1, 8, 0, 0, 0, tzinfo=pytz.UTC)
    third_week_2024 = datetime(2024, 1, 15, 0, 0, 0, tzinfo=pytz.UTC)
    fourth_week_2024 = datetime(2024, 1, 22, 0, 0, 0, tzinfo=pytz.UTC)

    from_time = first_week_2024 + timedelta(days=1)
    to_time = fourth_week_2024 + timedelta(days=2)

    # Week 1
    incident_0 = get_incident(creation_date=from_time + timedelta(hours=10))

    deployment_1 = get_deployment(conducted_at=from_time + timedelta(hours=12))

    deployment_2 = get_deployment(conducted_at=from_time + timedelta(hours=24))
    incident_1 = get_incident(creation_date=from_time + timedelta(hours=28))
    incident_2 = get_incident(creation_date=from_time + timedelta(hours=29))

    # Week 3
    deployment_3 = get_deployment(conducted_at=fourth_week_2024 - timedelta(days=4))
    incident_3 = get_incident(creation_date=fourth_week_2024 - timedelta(days=3))
    incident_4 = get_incident(creation_date=fourth_week_2024 - timedelta(days=3))

    deployment_4 = get_deployment(conducted_at=fourth_week_2024 - timedelta(days=2))

    deployment_5 = get_deployment(conducted_at=fourth_week_2024 - timedelta(hours=6))
    incident_5 = get_incident(creation_date=fourth_week_2024 - timedelta(hours=3))
    incident_6 = get_incident(creation_date=fourth_week_2024 - timedelta(hours=2))

    deployment_6 = get_deployment(conducted_at=fourth_week_2024 - timedelta(minutes=30))

    incidents = [
        incident_0,
        incident_1,
        incident_2,
        incident_3,
        incident_4,
        incident_5,
        incident_6,
    ]

    deployments = [
        deployment_1,
        deployment_2,
        deployment_3,
        deployment_4,
        deployment_5,
        deployment_6,
    ]

    incident_service = get_incident_service()
    weekly_change_failure_rate = incident_service.get_weekly_change_failure_rate(
        Interval(from_time, to_time),
        deployments,
        incidents,
    )

    assert weekly_change_failure_rate == {
        first_week_2024: get_change_failure_rate_metrics(
            set([deployment_2]), set([deployment_1, deployment_2])
        ),
        second_week_2024: get_change_failure_rate_metrics([], []),
        third_week_2024: get_change_failure_rate_metrics(
            set([deployment_3, deployment_5]),
            set([deployment_3, deployment_4, deployment_5, deployment_6]),
        ),
        fourth_week_2024: get_change_failure_rate_metrics([], []),
    }
