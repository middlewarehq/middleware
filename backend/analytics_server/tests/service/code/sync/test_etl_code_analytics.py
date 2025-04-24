from datetime import timedelta

from mhq.service.code.sync.etl_code_analytics import CodeETLAnalyticsService
from mhq.store.models.code import PullRequestState, PullRequestEventState
from mhq.utils.time import time_now
from tests.factories.models.code import (
    get_pull_request,
    get_pull_request_event,
    get_pull_request_commit,
)


def test_pr_performance_returns_first_review_tat_for_first_review():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=1)
    pr = get_pull_request(created_at=t1, updated_at=t1)
    pr_event = get_pull_request_event(pull_request_id=pr.id, created_at=t2)
    performance = pr_service.get_pr_performance(pr, [pr_event])
    assert performance.first_review_time == 3600


def test_pr_performance_returns_minus1_first_review_tat_for_no_reviews():
    pr_service = CodeETLAnalyticsService()
    pr = get_pull_request()
    performance = pr_service.get_pr_performance(pr, [])
    assert performance.first_review_time == -1


def test_pr_performance_returns_minus1_first_approved_review_tat_for_no_approved_review():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=1)
    pr = get_pull_request(created_at=t1, updated_at=t1)
    pr_event_1 = get_pull_request_event(
        pull_request_id=pr.id, state="REJECTED", created_at=t2
    )
    performance = pr_service.get_pr_performance(pr, [pr_event_1])
    assert performance.merge_time == -1


def test_pr_performance_returns_merge_time_minus1_for_merged_pr_without_review():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = time_now() + timedelta(minutes=30)
    pr = get_pull_request(
        state=PullRequestState.MERGED, state_changed_at=t2, created_at=t1, updated_at=t2
    )
    performance = pr_service.get_pr_performance(pr, [])
    assert performance.merge_time == -1


def test_pr_performance_returns_blocking_reviews():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = time_now() + timedelta(minutes=30)
    pr = get_pull_request(
        state=PullRequestState.MERGED,
        requested_reviews=["abc", "bcd"],
        state_changed_at=t2,
        created_at=t1,
        updated_at=t2,
    )
    performance = pr_service.get_pr_performance(pr, [])
    assert performance.blocking_reviews == 0


def test_pr_performance_returns_rework_time():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=1)
    t3 = t2 + timedelta(hours=1)
    t4 = t3 + timedelta(hours=1)
    pr = get_pull_request(
        state=PullRequestState.MERGED, state_changed_at=t4, created_at=t1, updated_at=t1
    )
    changes_requested_1 = get_pull_request_event(
        pull_request_id=pr.id,
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t2,
    )
    comment2 = get_pull_request_event(
        pull_request_id=pr.id,
        state=PullRequestEventState.COMMENTED.value,
        created_at=t3,
    )
    approval = get_pull_request_event(
        pull_request_id=pr.id, state=PullRequestEventState.APPROVED.value, created_at=t4
    )
    performance = pr_service.get_pr_performance(
        pr, [changes_requested_1, comment2, approval]
    )

    assert performance.rework_time == (t4 - t2).total_seconds()


def test_pr_performance_returns_rework_time_0_for_approved_prs():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=1)
    pr = get_pull_request(
        state=PullRequestState.MERGED, state_changed_at=t2, created_at=t1, updated_at=t1
    )
    approval = get_pull_request_event(
        pull_request_id=pr.id, state=PullRequestEventState.APPROVED.value, created_at=t2
    )
    performance = pr_service.get_pr_performance(pr, [approval])

    assert performance.rework_time == 0


def test_pr_performance_returns_rework_time_as_per_first_approved_prs():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=1)
    t3 = t2 + timedelta(hours=1)
    t4 = t3 + timedelta(hours=1)
    pr = get_pull_request(
        state=PullRequestState.MERGED, state_changed_at=t4, created_at=t1, updated_at=t1
    )
    changes_requested_1 = get_pull_request_event(
        pull_request_id=pr.id,
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t2,
    )
    approval = get_pull_request_event(
        pull_request_id=pr.id, state=PullRequestEventState.APPROVED.value, created_at=t3
    )
    approval_2 = get_pull_request_event(
        pull_request_id=pr.id, state=PullRequestEventState.APPROVED.value, created_at=t4
    )
    performance = pr_service.get_pr_performance(
        pr, [changes_requested_1, approval, approval_2]
    )

    assert performance.rework_time == (t3 - t2).total_seconds()


def test_pr_performance_returns_rework_time_for_open_prs():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=1)
    t3 = t2 + timedelta(hours=1)
    pr = get_pull_request(state=PullRequestState.OPEN, created_at=t1, updated_at=t1)
    changes_requested_1 = get_pull_request_event(
        pull_request_id=pr.id,
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t2,
    )
    approval = get_pull_request_event(
        pull_request_id=pr.id, state=PullRequestEventState.APPROVED.value, created_at=t3
    )
    performance = pr_service.get_pr_performance(pr, [changes_requested_1, approval])

    assert performance.rework_time == (t3 - t2).total_seconds()


def test_pr_performance_returns_rework_time_minus1_for_non_approved_prs():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=1)
    pr = get_pull_request(state=PullRequestState.OPEN, created_at=t1, updated_at=t1)
    changes_requested_1 = get_pull_request_event(
        pull_request_id=pr.id,
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t2,
    )
    performance = pr_service.get_pr_performance(pr, [changes_requested_1])

    assert performance.rework_time == -1


def test_pr_performance_returns_rework_time_minus1_for_merged_prs_without_reviews():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    pr = get_pull_request(
        state=PullRequestState.MERGED, state_changed_at=t1, created_at=t1, updated_at=t1
    )
    performance = pr_service.get_pr_performance(pr, [])

    assert performance.rework_time == -1


def test_pr_performance_returns_cycle_time_for_merged_pr():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(days=1)
    pr = get_pull_request(
        state=PullRequestState.MERGED, state_changed_at=t2, created_at=t1, updated_at=t2
    )
    performance = pr_service.get_pr_performance(pr, [])

    assert performance.cycle_time == 86400


def test_pr_performance_returns_cycle_time_minus1_for_non_merged_pr():
    pr_service = CodeETLAnalyticsService()
    pr = get_pull_request()
    performance = pr_service.get_pr_performance(pr, [])

    assert performance.cycle_time == -1


def test_pr_rework_cycles_returns_zero_cycles_when_pr_approved():
    pr_service = CodeETLAnalyticsService()
    pr = get_pull_request(reviewers=["dhruv", "jayant"])
    t1 = time_now()
    t2 = t1 + timedelta(seconds=1)
    commit = get_pull_request_commit(pr_id=pr.id, created_at=t1)
    reviews = [get_pull_request_event(reviewer="dhruv", created_at=t2)]
    assert pr_service.get_rework_cycles(pr, reviews, [commit]) == 0


def test_rework_cycles_returns_1_cycle_if_some_rework_done():
    pr = get_pull_request(reviewers=["dhruv", "jayant"])
    t1 = time_now()
    t2 = t1 + timedelta(seconds=1)
    t3 = t1 + timedelta(seconds=2)
    review_1 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t1,
    )
    commit = get_pull_request_commit(pr_id=pr.id, created_at=t2)
    review_2 = get_pull_request_event(
        pull_request_id=pr.id, reviewer="dhruv", created_at=t3
    )
    pr_service = CodeETLAnalyticsService()
    assert pr_service.get_rework_cycles(pr, [review_1, review_2], [commit]) == 1


def test_rework_cycles_returns_2_cycles_if_there_were_comments_between_commit_batch():
    pr = get_pull_request(reviewers=["dhruv", "jayant"])
    t1 = time_now()
    t2 = t1 + timedelta(seconds=1)
    t3 = t1 + timedelta(seconds=2)
    t4 = t1 + timedelta(seconds=3)
    t5 = t1 + timedelta(seconds=4)
    review_1 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t1,
    )
    commit_1 = get_pull_request_commit(pr_id=pr.id, created_at=t2)
    review_2 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t3,
    )
    commit_2 = get_pull_request_commit(pr_id=pr.id, created_at=t4)
    review_3 = get_pull_request_event(
        pull_request_id=pr.id, reviewer="dhruv", created_at=t5
    )
    pr_service = CodeETLAnalyticsService()
    assert (
        pr_service.get_rework_cycles(
            pr, [review_1, review_2, review_3], [commit_1, commit_2]
        )
        == 2
    )


def test_rework_cycles_returns_1_cycle_despite_multiple_commits():
    pr = get_pull_request(reviewers=["dhruv", "jayant"])
    t1 = time_now()
    t2 = t1 + timedelta(seconds=1)
    t3 = t1 + timedelta(seconds=2)
    review_1 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t1,
    )
    commit_1 = get_pull_request_commit(pr_id=pr.id, created_at=t2)
    commit_2 = get_pull_request_commit(pr_id=pr.id, created_at=t2)
    commit_3 = get_pull_request_commit(pr_id=pr.id, created_at=t2)
    review_2 = get_pull_request_event(
        pull_request_id=pr.id, reviewer="dhruv", created_at=t3
    )
    pr_service = CodeETLAnalyticsService()
    assert (
        pr_service.get_rework_cycles(
            pr, [review_1, review_2], [commit_1, commit_2, commit_3]
        )
        == 1
    )


def test_rework_cycles_returns_2_cycles_despite_multiple_comments():
    pr = get_pull_request(reviewers=["dhruv", "jayant"])
    t1 = time_now()
    t2 = t1 + timedelta(seconds=1)
    t3 = t1 + timedelta(seconds=2)
    t4 = t1 + timedelta(seconds=3)
    t5 = t1 + timedelta(seconds=4)
    review_1 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.COMMENTED.value,
        created_at=t1,
    )
    review_2 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.COMMENTED.value,
        created_at=t1,
    )
    review_3 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t1,
    )
    commit_1 = get_pull_request_commit(pr_id=pr.id, created_at=t2)
    review_4 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t3,
    )
    commit_2 = get_pull_request_commit(pr_id=pr.id, created_at=t4)
    review_5 = get_pull_request_event(
        pull_request_id=pr.id, reviewer="dhruv", created_at=t5
    )
    review_6 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.COMMENTED.value,
        created_at=t5,
    )
    pr_service = CodeETLAnalyticsService()
    assert (
        pr_service.get_rework_cycles(
            pr,
            [review_1, review_2, review_3, review_4, review_5, review_6],
            [commit_1, commit_2],
        )
        == 2
    )


def test_rework_cycles_doesnt_count_commits_post_first_approval():
    pr = get_pull_request(reviewers=["dhruv", "jayant"])
    t1 = time_now()
    t2 = t1 + timedelta(seconds=1)
    t3 = t1 + timedelta(seconds=2)
    t4 = t1 + timedelta(seconds=3)
    t5 = t1 + timedelta(seconds=4)
    t6 = t1 + timedelta(seconds=5)
    review_1 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t1,
    )
    commit_1 = get_pull_request_commit(pr_id=pr.id, created_at=t2)
    review_2 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.COMMENTED.value,
        created_at=t3,
    )
    commit_2 = get_pull_request_commit(pr_id=pr.id, created_at=t4)
    review_3 = get_pull_request_event(
        pull_request_id=pr.id, reviewer="dhruv", created_at=t5
    )
    commit_3 = get_pull_request_commit(pr_id=pr.id, created_at=t6)
    commit_4 = get_pull_request_commit(pr_id=pr.id, created_at=t6)
    pr_service = CodeETLAnalyticsService()
    assert (
        pr_service.get_rework_cycles(
            pr, [review_1, review_2, review_3], [commit_1, commit_2, commit_3, commit_4]
        )
        == 2
    )


def test_rework_cycles_returns_0_for_unapproved_pr():
    pr = get_pull_request(reviewers=["dhruv", "jayant"])
    t1 = time_now()
    t2 = t1 + timedelta(seconds=1)
    t3 = t1 + timedelta(seconds=2)
    t4 = t1 + timedelta(seconds=3)
    t5 = t1 + timedelta(seconds=4)
    t6 = t1 + timedelta(seconds=5)
    review_1 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t1,
    )
    commit_1 = get_pull_request_commit(pr_id=pr.id, created_at=t2)
    review_2 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t3,
    )
    commit_2 = get_pull_request_commit(pr_id=pr.id, created_at=t4)
    review_3 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t5,
    )
    commit_3 = get_pull_request_commit(pr_id=pr.id, created_at=t6)
    commit_4 = get_pull_request_commit(pr_id=pr.id, created_at=t6)
    pr_service = CodeETLAnalyticsService()
    assert (
        pr_service.get_rework_cycles(
            pr, [review_1, review_2, review_3], [commit_1, commit_2, commit_3, commit_4]
        )
        == 0
    )


def test_rework_cycles_returs_0_for_non_reviewer_comments():
    pr = get_pull_request(reviewers=["dhruv", "jayant"])
    t1 = time_now()
    t2 = t1 + timedelta(seconds=1)
    t3 = t1 + timedelta(seconds=2)
    t4 = t1 + timedelta(seconds=3)
    t5 = t1 + timedelta(seconds=4)
    t6 = t1 + timedelta(seconds=5)
    review_1 = get_pull_request_event(
        pull_request_id=pr.id,
        state=PullRequestEventState.COMMENTED.value,
        created_at=t1,
    )
    commit_1 = get_pull_request_commit(pr_id=pr.id, created_at=t2)
    review_2 = get_pull_request_event(
        pull_request_id=pr.id,
        state=PullRequestEventState.COMMENTED.value,
        created_at=t3,
    )
    commit_2 = get_pull_request_commit(pr_id=pr.id, created_at=t4)
    review_3 = get_pull_request_event(
        pull_request_id=pr.id,
        state=PullRequestEventState.COMMENTED.value,
        created_at=t5,
    )
    commit_3 = get_pull_request_commit(pr_id=pr.id, created_at=t6)
    review_4 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.APPROVED.value,
        created_at=t5,
    )
    pr_service = CodeETLAnalyticsService()
    assert (
        pr_service.get_rework_cycles(
            pr, [review_1, review_2, review_3, review_4], [commit_1, commit_2, commit_3]
        )
        == 0
    )


def test_rework_cycles_returs_1_for_multiple_approvals():
    pr = get_pull_request(reviewers=["dhruv", "jayant"])
    t1 = time_now()
    t2 = t1 + timedelta(seconds=1)
    t3 = t1 + timedelta(seconds=2)
    t4 = t1 + timedelta(seconds=3)
    t5 = t1 + timedelta(seconds=4)
    t6 = t1 + timedelta(seconds=5)
    t7 = t1 + timedelta(seconds=6)
    review_1 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t1,
    )
    commit_1 = get_pull_request_commit(pr_id=pr.id, created_at=t2)
    review_2 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.APPROVED.value,
        created_at=t3,
    )
    commit_2 = get_pull_request_commit(pr_id=pr.id, created_at=t4)
    review_3 = get_pull_request_event(
        pull_request_id=pr.id,
        state=PullRequestEventState.COMMENTED.value,
        created_at=t5,
    )
    commit_3 = get_pull_request_commit(pr_id=pr.id, created_at=t6)
    review_4 = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="dhruv",
        state=PullRequestEventState.APPROVED.value,
        created_at=t7,
    )
    pr_service = CodeETLAnalyticsService()
    assert (
        pr_service.get_rework_cycles(
            pr, [review_1, review_2, review_3, review_4], [commit_1, commit_2, commit_3]
        )
        == 1
    )


def test_create_pr_metrics_filters_bot_events():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=1)
    t3 = t2 + timedelta(hours=1)
    pr = get_pull_request(state=PullRequestState.MERGED, created_at=t1, updated_at=t1)
    bot_event = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="test-bot[bot]",
        state=PullRequestEventState.COMMENTED.value,
        created_at=t2,
    )
    human_event = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="human_user",
        state=PullRequestEventState.APPROVED.value,
        created_at=t3,
    )
    pr_metrics = pr_service.create_pr_metrics(pr, [bot_event, human_event], [])
    assert "human_user" in pr_metrics.reviewers
    assert "test-bot[bot]" not in pr_metrics.reviewers


def test_create_pr_metrics_no_bot_first_response_time():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=1)
    pr = get_pull_request(state=PullRequestState.MERGED, created_at=t1, updated_at=t1)
    first_review_event = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="reviewer",
        state=PullRequestEventState.COMMENTED.value,
        created_at=t2,
    )
    pr_metrics = pr_service.create_pr_metrics(pr, [first_review_event], [])
    assert pr_metrics.first_response_time == 3600


def test_create_pr_metrics_no_bot_rework_time():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=1)
    t3 = t2 + timedelta(hours=1)
    pr = get_pull_request(state=PullRequestState.MERGED, created_at=t1, updated_at=t1)
    changes_requested_event = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="reviewer",
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t2,
    )
    approval_event = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="reviewer",
        state=PullRequestEventState.APPROVED.value,
        created_at=t3,
    )
    pr_metrics = pr_service.create_pr_metrics(
        pr, [changes_requested_event, approval_event], []
    )
    assert pr_metrics.rework_time == 3600


def test_create_pr_metrics_no_human_first_response_time():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=1)
    pr = get_pull_request(state=PullRequestState.MERGED, created_at=t1, updated_at=t1)
    first_review_event = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="test-bot[bot]",
        state=PullRequestEventState.COMMENTED.value,
        created_at=t2,
    )
    pr_metrics = pr_service.create_pr_metrics(pr, [first_review_event], [])
    assert pr_metrics.first_response_time is None


def test_create_pr_metrics_no_human_rework_time():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=1)
    t3 = t2 + timedelta(hours=1)
    pr = get_pull_request(state=PullRequestState.MERGED, created_at=t1, updated_at=t1)
    changes_requested_event = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="test-bot[bot]",
        state=PullRequestEventState.CHANGES_REQUESTED.value,
        created_at=t2,
    )
    approval_event = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="test-bot[bot]",
        state=PullRequestEventState.APPROVED.value,
        created_at=t3,
    )
    pr_metrics = pr_service.create_pr_metrics(
        pr, [changes_requested_event, approval_event], []
    )
    assert pr_metrics.rework_time is None

def test_create_pr_metrics_filters_bot_type_events():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=1)
    t3 = t2 + timedelta(hours=1)
    pr = get_pull_request(state=PullRequestState.MERGED, created_at=t1, updated_at=t1)
    
    bot_event = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="github_app",
        state=PullRequestEventState.COMMENTED.value,
        created_at=t2,
        data={"user": {"type": "Bot"}},
    )
    
    human_event = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="human_user",
        state=PullRequestEventState.APPROVED.value,
        created_at=t3,
    )
    
    pr_metrics = pr_service.create_pr_metrics(pr, [bot_event, human_event], [])
    assert "human_user" in pr_metrics.reviewers
    assert "github_app" not in pr_metrics.reviewers