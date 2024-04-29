import pytz
from datetime import datetime
from datetime import timedelta
from tests.factories.models.incidents import get_mean_time_to_recovery_metrics
from mhq.service.incidents.incidents import get_incident_service, IncidentService
from mhq.utils.time import Interval

from tests.factories.models import get_incident


first_week_2024 = datetime(2024, 1, 1, 0, 0, 0, tzinfo=pytz.UTC)
second_week_2024 = datetime(2024, 1, 8, 0, 0, 0, tzinfo=pytz.UTC)
third_week_2024 = datetime(2024, 1, 15, 0, 0, 0, tzinfo=pytz.UTC)
fourth_week_2024 = datetime(2024, 1, 22, 0, 0, 0, tzinfo=pytz.UTC)


def test_get_incidents_mean_time_to_recovery_for_no_incidents():

    incident_service = IncidentService(None, None)
    mean_time_to_recovery = incident_service._get_incidents_mean_time_to_recovery([])

    assert get_mean_time_to_recovery_metrics(None, 0) == mean_time_to_recovery


def test_get_incidents_mean_time_to_recovery_for_incidents():

    incident_service = IncidentService(None, None)

    incident_1_resolution_time = timedelta(seconds=100)
    incident_1 = get_incident(
        creation_date=first_week_2024,
        resolved_date=first_week_2024 + incident_1_resolution_time,
    )

    incident_2_resolution_time = timedelta(seconds=300)
    incident_2 = get_incident(
        creation_date=first_week_2024,
        resolved_date=first_week_2024 + incident_2_resolution_time,
    )

    incident_3_resolution_time = timedelta(seconds=800)
    incident_3 = get_incident(
        creation_date=first_week_2024,
        resolved_date=first_week_2024 + incident_3_resolution_time,
    )

    incident_4_resolution_time = timedelta(seconds=90)
    incident_4 = get_incident(
        creation_date=first_week_2024,
        resolved_date=first_week_2024 + incident_4_resolution_time,
    )

    assert get_mean_time_to_recovery_metrics(
        (
            incident_1_resolution_time.seconds
            + incident_2_resolution_time.seconds
            + incident_3_resolution_time.seconds
        )
        / 3,
        3,
    ) == incident_service._get_incidents_mean_time_to_recovery(
        [incident_1, incident_2, incident_3]
    )

    assert get_mean_time_to_recovery_metrics(
        (
            incident_1_resolution_time.seconds
            + incident_2_resolution_time.seconds
            + incident_3_resolution_time.seconds
            + incident_4_resolution_time.seconds
        )
        / 4,
        4,
    ) == incident_service._get_incidents_mean_time_to_recovery(
        [incident_1, incident_2, incident_3, incident_4]
    )


def test_get_deployment_incidents_count_map_returns_empty_dict_when_given_some_incidents_no_deployments():
    incident_service = get_incident_service()
    mean_time_to_recovery_trends = (
        incident_service._get_incidents_mean_time_to_recovery_trends(
            [],
            Interval(first_week_2024, third_week_2024 + timedelta(seconds=20)),
        )
    )
    assert mean_time_to_recovery_trends == {
        first_week_2024: get_mean_time_to_recovery_metrics(None, 0),
        second_week_2024: get_mean_time_to_recovery_metrics(None, 0),
        third_week_2024: get_mean_time_to_recovery_metrics(None, 0),
    }


def test_get_change_failure_rate_for_one_incidents_bw_two_deployments():

    incident_service = get_incident_service()

    from_time = first_week_2024
    to_time = fourth_week_2024

    # Week 1
    incident_0_resolution_time = timedelta(seconds=100)
    incident_0 = get_incident(
        creation_date=from_time + timedelta(hours=10),
        resolved_date=from_time + timedelta(hours=10) + incident_0_resolution_time,
    )

    incident_1_resolution_time = timedelta(seconds=100)
    incident_1 = get_incident(
        creation_date=from_time + timedelta(hours=28),
        resolved_date=from_time + timedelta(hours=28) + incident_1_resolution_time,
    )

    incident_2_resolution_time = timedelta(seconds=400)
    incident_2 = get_incident(
        creation_date=from_time + timedelta(hours=29),
        resolved_date=from_time + timedelta(hours=29) + incident_2_resolution_time,
    )

    # Week 3
    incident_3_resolution_time = timedelta(seconds=100)
    incident_3 = get_incident(
        creation_date=third_week_2024 + timedelta(days=2),
        resolved_date=third_week_2024 + timedelta(days=2) + incident_3_resolution_time,
    )

    incident_4_resolution_time = timedelta(seconds=100)
    incident_4 = get_incident(
        creation_date=third_week_2024 + timedelta(days=4),
        resolved_date=third_week_2024 + timedelta(days=4) + incident_4_resolution_time,
    )

    incident_5_resolution_time = timedelta(seconds=100)
    incident_5 = get_incident(
        creation_date=third_week_2024 + timedelta(days=4),
        resolved_date=third_week_2024 + timedelta(days=4) + incident_5_resolution_time,
    )

    incident_6_resolution_time = timedelta(seconds=100)
    incident_6 = get_incident(
        creation_date=third_week_2024 + timedelta(days=3),
        resolved_date=third_week_2024 + timedelta(days=3) + incident_6_resolution_time,
    )

    mean_time_to_recovery_trends = (
        incident_service._get_incidents_mean_time_to_recovery_trends(
            [
                incident_0,
                incident_1,
                incident_2,
                incident_3,
                incident_4,
                incident_5,
                incident_6,
            ],
            Interval(from_time, to_time),
        )
    )

    print(mean_time_to_recovery_trends)

    assert mean_time_to_recovery_trends == {
        first_week_2024: get_mean_time_to_recovery_metrics(
            (
                incident_0_resolution_time.seconds
                + incident_1_resolution_time.seconds
                + incident_2_resolution_time.seconds
            )
            / 3,
            3,
        ),
        second_week_2024: get_mean_time_to_recovery_metrics(None, 0),
        third_week_2024: get_mean_time_to_recovery_metrics(
            (
                incident_3_resolution_time.seconds
                + incident_4_resolution_time.seconds
                + incident_5_resolution_time.seconds
                + incident_6_resolution_time.seconds
            )
            / 4,
            4,
        ),
        fourth_week_2024: get_mean_time_to_recovery_metrics(None, 0),
    }
