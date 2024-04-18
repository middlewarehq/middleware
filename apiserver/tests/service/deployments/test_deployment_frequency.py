from datetime import datetime, timedelta

import pytz
from dora.service.deployments.analytics import DeploymentAnalyticsService
from dora.utils.time import Interval
from tests.factories.models.code import get_deployment, get_deployment_frequency_metrics

first_week_2024 = datetime(2024, 1, 1, 0, 0, 0, tzinfo=pytz.UTC)
second_week_2024 = datetime(2024, 1, 8, 0, 0, 0, tzinfo=pytz.UTC)
third_week_2024 = datetime(2024, 1, 15, 0, 0, 0, tzinfo=pytz.UTC)
fourth_week_2024 = datetime(2024, 1, 22, 0, 0, 0, tzinfo=pytz.UTC)


def test_deployment_frequency_for_no_deployments():

    from_time = first_week_2024 + timedelta(days=1)
    to_time = third_week_2024 + timedelta(days=2)

    deployment_analytics_service = DeploymentAnalyticsService(None, None)

    assert (
        deployment_analytics_service._get_deployment_frequency_metrics(
            [], Interval(from_time, to_time)
        )
        == get_deployment_frequency_metrics()
    )


def test_deployment_frequency_for_deployments_across_days():

    from_time = first_week_2024 + timedelta(days=1)
    to_time = first_week_2024 + timedelta(days=4)

    deployment_1 = get_deployment(conducted_at=from_time + timedelta(hours=12))
    deployment_2 = get_deployment(conducted_at=from_time + timedelta(days=1))
    deployment_3 = get_deployment(conducted_at=from_time + timedelta(days=2))

    deployment_outside_interval = get_deployment(
        conducted_at=to_time + timedelta(days=20)
    )

    deployment_analytics_service = DeploymentAnalyticsService(None, None)

    assert deployment_analytics_service._get_deployment_frequency_metrics(
        [deployment_1, deployment_2, deployment_3, deployment_outside_interval],
        Interval(from_time, to_time),
    ) == get_deployment_frequency_metrics(3, 0, 3, 3)


def test_deployment_frequency_for_deployments_across_weeks():

    from_time = first_week_2024 + timedelta(days=1)
    to_time = fourth_week_2024 + timedelta(days=1)

    # Week 1

    deployment_1 = get_deployment(conducted_at=from_time + timedelta(hours=12))
    deployment_2 = get_deployment(conducted_at=from_time + timedelta(hours=24))

    # Week 3
    deployment_3 = get_deployment(conducted_at=fourth_week_2024 - timedelta(days=4))
    deployment_4 = get_deployment(conducted_at=fourth_week_2024 - timedelta(days=2))
    deployment_5 = get_deployment(conducted_at=fourth_week_2024 - timedelta(hours=6))
    deployment_6 = get_deployment(conducted_at=fourth_week_2024 - timedelta(minutes=30))

    deployment_analytics_service = DeploymentAnalyticsService(None, None)

    assert deployment_analytics_service._get_deployment_frequency_metrics(
        [
            deployment_1,
            deployment_2,
            deployment_3,
            deployment_4,
            deployment_5,
            deployment_6,
        ],
        Interval(from_time, to_time),
    ) == get_deployment_frequency_metrics(6, 0, 1, 6)


def test_deployment_frequency_for_deployments_across_months():

    from_time = first_week_2024 + timedelta(days=1)
    to_time = datetime(2024, 3, 31, 0, 0, 0, tzinfo=pytz.UTC)

    second_month_2024 = datetime(2024, 2, 1, 0, 0, 0, tzinfo=pytz.UTC)

    print((to_time - from_time).days)

    # Month 1

    deployment_1 = get_deployment(conducted_at=from_time + timedelta(hours=12))
    deployment_2 = get_deployment(conducted_at=from_time + timedelta(hours=24))
    deployment_3 = get_deployment(conducted_at=fourth_week_2024 - timedelta(days=4))
    deployment_4 = get_deployment(conducted_at=fourth_week_2024 - timedelta(days=2))
    deployment_5 = get_deployment(conducted_at=fourth_week_2024 - timedelta(hours=6))
    deployment_6 = get_deployment(conducted_at=fourth_week_2024 - timedelta(minutes=30))

    # Month 2

    deployment_7 = get_deployment(conducted_at=second_month_2024 + timedelta(days=3))
    deployment_8 = get_deployment(conducted_at=second_month_2024 + timedelta(days=2))
    deployment_9 = get_deployment(
        conducted_at=second_month_2024 + timedelta(minutes=30)
    )

    # Month 3

    deployment_10 = get_deployment(conducted_at=to_time - timedelta(days=3))
    deployment_11 = get_deployment(conducted_at=to_time - timedelta(days=2))
    deployment_12 = get_deployment(conducted_at=to_time - timedelta(days=1))
    deployment_13 = get_deployment(conducted_at=to_time - timedelta(days=1))

    deployment_analytics_service = DeploymentAnalyticsService(None, None)

    assert deployment_analytics_service._get_deployment_frequency_metrics(
        [
            deployment_1,
            deployment_2,
            deployment_3,
            deployment_4,
            deployment_5,
            deployment_6,
            deployment_7,
            deployment_8,
            deployment_9,
            deployment_10,
            deployment_11,
            deployment_12,
            deployment_13,
        ],
        Interval(from_time, to_time),
    ) == get_deployment_frequency_metrics(13, 0, 1, 4)
