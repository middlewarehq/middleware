from datetime import timedelta

from dora.service.deployments.deployment_pr_mapper import DeploymentPRMapperService
from dora.store.models.code import PullRequestState
from dora.utils.time import time_now
from tests.factories.models.code import get_pull_request, get_repo_workflow_run


def test_deployment_pr_mapper_picks_prs_directly_merged_to_head_branch():
    t = time_now()
    dep_branch = "release"
    pr_to_main = get_pull_request(
        state=PullRequestState.MERGED,
        head_branch="feature",
        base_branch="main",
        state_changed_at=t,
    )
    pr_to_release = get_pull_request(
        state=PullRequestState.MERGED,
        head_branch="feature",
        base_branch="release",
        state_changed_at=t + timedelta(days=2),
    )
    assert DeploymentPRMapperService().get_all_prs_deployed(
        [pr_to_main, pr_to_release],
        get_repo_workflow_run(
            head_branch=dep_branch, conducted_at=t + timedelta(days=7)
        ),
    ) == [pr_to_release]


def test_deployment_pr_mapper_ignores_prs_not_related_to_head_branch_directly_or_indirectly():
    t = time_now()
    dep_branch = "release2"
    pr_to_main = get_pull_request(
        state=PullRequestState.MERGED,
        head_branch="feature",
        base_branch="main",
        state_changed_at=t + timedelta(days=1),
    )
    pr_to_release = get_pull_request(
        state=PullRequestState.MERGED,
        head_branch="feature",
        base_branch="release",
        state_changed_at=t + timedelta(days=2),
    )
    assert (
        DeploymentPRMapperService().get_all_prs_deployed(
            [pr_to_main, pr_to_release],
            get_repo_workflow_run(
                head_branch=dep_branch, conducted_at=t + timedelta(days=7)
            ),
        )
        == []
    )


def test_deployment_pr_mapper_picks_prs_on_the_path_to_head_branch():
    t = time_now()
    dep_branch = "release"
    pr_to_feature = get_pull_request(
        state=PullRequestState.MERGED,
        head_branch="custom_feature",
        base_branch="feature",
    )
    pr_to_main = get_pull_request(
        state=PullRequestState.MERGED,
        head_branch="feature",
        base_branch="main",
        state_changed_at=t + timedelta(days=2),
    )
    pr_to_release = get_pull_request(
        state=PullRequestState.MERGED,
        head_branch="main",
        base_branch="release",
        state_changed_at=t + timedelta(days=4),
    )
    assert sorted(
        [
            x.id
            for x in DeploymentPRMapperService().get_all_prs_deployed(
                [pr_to_feature, pr_to_main, pr_to_release],
                get_repo_workflow_run(
                    head_branch=dep_branch, conducted_at=t + timedelta(days=7)
                ),
            )
        ]
    ) == sorted([x.id for x in [pr_to_main, pr_to_release, pr_to_feature]])


def test_deployment_pr_mapper_doesnt_pick_any_pr_if_no_pr_merged_to_head_branch():
    t = time_now()
    dep_branch = "release"
    pr_to_main = get_pull_request(
        state=PullRequestState.MERGED,
        head_branch="feature",
        base_branch="main",
        state_changed_at=t,
    )
    assert (
        DeploymentPRMapperService().get_all_prs_deployed(
            [pr_to_main],
            get_repo_workflow_run(
                head_branch=dep_branch, conducted_at=t + timedelta(days=4)
            ),
        )
        == []
    )


def test_deployment_pr_mapper_picks_only_merged_prs_not_open_or_closed():
    t = time_now()
    dep_branch = "release"
    pr_to_feature = get_pull_request(
        state=PullRequestState.OPEN,
        head_branch="custom_feature",
        base_branch="feature",
        created_at=t,
        state_changed_at=None,
    )
    pr_to_main = get_pull_request(
        state=PullRequestState.MERGED,
        head_branch="feature",
        base_branch="main",
        state_changed_at=t + timedelta(days=2),
    )
    pr_to_release = get_pull_request(
        state=PullRequestState.CLOSED,
        head_branch="main",
        base_branch="release",
        state_changed_at=t + timedelta(days=3),
    )
    assert (
        DeploymentPRMapperService().get_all_prs_deployed(
            [pr_to_feature, pr_to_main, pr_to_release],
            get_repo_workflow_run(
                head_branch=dep_branch, conducted_at=t + timedelta(days=7)
            ),
        )
        == []
    )


def test_deployment_pr_mapper_returns_empty_for_no_prs():
    dep_branch = "release"
    assert (
        DeploymentPRMapperService().get_all_prs_deployed(
            [], get_repo_workflow_run(head_branch=dep_branch)
        )
        == []
    )


def test_deployment_pr_mapper_ignores_sub_prs_merged_post_main_pr_merge():
    dep_branch = "release"
    t = time_now()
    first_feature_pr = get_pull_request(
        state=PullRequestState.MERGED,
        head_branch="feature",
        base_branch="master",
        state_changed_at=t,
    )
    second_feature_pr = get_pull_request(
        state=PullRequestState.MERGED,
        head_branch="feature",
        base_branch="master",
        state_changed_at=t + timedelta(days=4),
    )
    pr_to_release = get_pull_request(
        state=PullRequestState.MERGED,
        head_branch="master",
        base_branch="release",
        state_changed_at=t + timedelta(days=2),
    )

    prs = DeploymentPRMapperService().get_all_prs_deployed(
        [first_feature_pr, second_feature_pr, pr_to_release],
        get_repo_workflow_run(
            head_branch=dep_branch, conducted_at=t + timedelta(days=5)
        ),
    )

    assert sorted(prs) == sorted([first_feature_pr, pr_to_release])
