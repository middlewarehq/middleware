from mhq.utils.string import uuid4_str
from tests.utilities import compare_objects_as_dicts
from mhq.service.code.lead_time import LeadTimeService
from mhq.service.code.models.lead_time import LeadTimeMetrics


class FakeCodeRepoService:
    pass


class FakeDeploymentsService:
    pass


def test_get_avg_time_for_multiple_lead_time_metrics_returns_correct_average():
    lead_time_metrics = [
        LeadTimeMetrics(first_response_time=1, pr_count=1),
        LeadTimeMetrics(first_response_time=2, pr_count=1),
    ]
    field = "first_response_time"

    lead_time_service = LeadTimeService(FakeCodeRepoService, FakeDeploymentsService)

    result = lead_time_service._get_avg_time(lead_time_metrics, field)
    assert result == 1.5


def test_get_avg_time_for_different_lead_time_metrics_given_returns_correct_average():
    lead_time_metrics = [
        LeadTimeMetrics(first_response_time=1, pr_count=1),
        LeadTimeMetrics(first_response_time=0, pr_count=0),
        LeadTimeMetrics(first_response_time=3, pr_count=1),
    ]
    field = "first_response_time"

    lead_time_service = LeadTimeService(FakeCodeRepoService, FakeDeploymentsService)

    result = lead_time_service._get_avg_time(lead_time_metrics, field)
    assert result == 2


def test_get_avg_time_for_no_lead_time_metrics_returns_zero():
    lead_time_metrics = []
    field = "first_response_time"

    lead_time_service = LeadTimeService(FakeCodeRepoService, FakeDeploymentsService)

    result = lead_time_service._get_avg_time(lead_time_metrics, field)
    assert result == 0


def test_get_avg_time_for_empty_lead_time_metrics_returns_zero():
    lead_time_metrics = [LeadTimeMetrics(), LeadTimeMetrics()]
    field = "first_response_time"

    lead_time_service = LeadTimeService(FakeCodeRepoService, FakeDeploymentsService)

    result = lead_time_service._get_avg_time(lead_time_metrics, field)
    assert result == 0


def test_get_weighted_avg_lead_time_metrics_returns_correct_average():
    lead_time_metrics = [
        LeadTimeMetrics(
            first_commit_to_open=1,
            first_response_time=4,
            rework_time=10,
            merge_time=1,
            merge_to_deploy=1,
            pr_count=1,
        ),
        LeadTimeMetrics(
            first_commit_to_open=2,
            first_response_time=3,
            rework_time=10,
            merge_time=1,
            merge_to_deploy=1,
            pr_count=2,
        ),
        LeadTimeMetrics(
            first_commit_to_open=3,
            first_response_time=2,
            rework_time=10,
            merge_time=1,
            merge_to_deploy=1,
            pr_count=3,
        ),
        LeadTimeMetrics(
            first_commit_to_open=4,
            first_response_time=1,
            rework_time=10,
            merge_time=1,
            merge_to_deploy=1,
            pr_count=4,
        ),
    ]

    lead_time_service = LeadTimeService(FakeCodeRepoService, FakeDeploymentsService)

    result = lead_time_service._get_weighted_avg_lead_time_metrics(lead_time_metrics)

    expected = LeadTimeMetrics(
        first_commit_to_open=3,
        first_response_time=2,
        rework_time=10,
        merge_time=1,
        merge_to_deploy=1,
        pr_count=10,
    )
    assert compare_objects_as_dicts(result, expected)


def test_get_teams_avg_lead_time_metrics_returns_correct_values():

    team_1 = uuid4_str()
    team_2 = uuid4_str()

    team_lead_time_metrics = {
        team_1: [
            LeadTimeMetrics(
                first_commit_to_open=1,
                first_response_time=4,
                rework_time=10,
                merge_time=1,
                merge_to_deploy=1,
                pr_count=1,
            ),
            LeadTimeMetrics(
                first_commit_to_open=2,
                first_response_time=3,
                rework_time=10,
                merge_time=1,
                merge_to_deploy=1,
                pr_count=2,
            ),
            LeadTimeMetrics(
                first_commit_to_open=3,
                first_response_time=2,
                rework_time=10,
                merge_time=1,
                merge_to_deploy=1,
                pr_count=3,
            ),
            LeadTimeMetrics(
                first_commit_to_open=4,
                first_response_time=1,
                rework_time=10,
                merge_time=1,
                merge_to_deploy=1,
                pr_count=4,
            ),
        ],
        team_2: [
            LeadTimeMetrics(
                first_commit_to_open=1,
                first_response_time=4,
                rework_time=10,
                merge_time=1,
                merge_to_deploy=1,
                pr_count=1,
            ),
            LeadTimeMetrics(
                first_commit_to_open=2,
                first_response_time=3,
                rework_time=10,
                merge_time=1,
                merge_to_deploy=1,
                pr_count=2,
            ),
        ],
    }

    lead_time_service = LeadTimeService(FakeCodeRepoService, FakeDeploymentsService)

    result = lead_time_service.get_avg_lead_time_metrics_from_map(
        team_lead_time_metrics
    )

    expected = {
        team_1: LeadTimeMetrics(
            first_commit_to_open=3,
            first_response_time=2,
            rework_time=10,
            merge_time=1,
            merge_to_deploy=1,
            pr_count=10,
        ),
        team_2: LeadTimeMetrics(
            first_commit_to_open=5 / 3,
            first_response_time=10 / 3,
            rework_time=10,
            merge_time=1,
            merge_to_deploy=1,
            pr_count=3,
        ),
    }
    assert compare_objects_as_dicts(result[team_1], expected[team_1])
    assert compare_objects_as_dicts(result[team_2], expected[team_2])
