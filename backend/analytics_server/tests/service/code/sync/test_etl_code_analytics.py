from datetime import timedelta

from mhq.service.code.sync.etl_code_analytics import CodeETLAnalyticsService
from mhq.store.models.code import PullRequestState, PullRequestEventState
from mhq.store.models.code.enums import PullRequestEventType
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


def test_filter_non_bot_events_common_patterns():
    pr_service = CodeETLAnalyticsService()

    bot_events = [
        get_pull_request_event(reviewer="github-actions[bot]"),
        get_pull_request_event(reviewer="jenkins-bot"),
        get_pull_request_event(reviewer="renovate[bot]"),
        get_pull_request_event(reviewer="test_bot_service"),
        get_pull_request_event(reviewer="my_bot"),
        get_pull_request_event(reviewer="bot_user"),
        get_pull_request_event(reviewer="SomeService-bot-123"),
        get_pull_request_event(reviewer="CI-BOT"),
        get_pull_request_event(reviewer="bot-123[bot]"),
        get_pull_request_event(reviewer="helper_bot_v2"),
    ]
    human_events = [
        get_pull_request_event(reviewer="john_doe"),
        get_pull_request_event(reviewer="robotics_expert"),
        get_pull_request_event(reviewer="sabotage"),
        get_pull_request_event(reviewer="lobotomy"),
        get_pull_request_event(reviewer="cubot"),
        get_pull_request_event(reviewer="botany"),
    ]

    all_events = bot_events + human_events
    filtered_events = pr_service.filter_non_bot_events(all_events)

    assert len(filtered_events) == len(human_events)

    filtered_usernames = [e.actor_username for e in filtered_events]
    for event in bot_events:
        assert event.actor_username not in filtered_usernames

    for event in human_events:
        assert event.actor_username in filtered_usernames


def test_filter_non_bot_events_edge_cases():
    pr_service = CodeETLAnalyticsService()

    events = [
        get_pull_request_event(reviewer="test-bot[123]"),
        get_pull_request_event(reviewer="deploy bot"),
        get_pull_request_event(reviewer="special@bot@chars"),
        get_pull_request_event(reviewer="robo"),
        get_pull_request_event(reviewer="botanic"),
        get_pull_request_event(reviewer="robot"),
        get_pull_request_event(reviewer="abot"),
    ]

    filtered_events = pr_service.filter_non_bot_events(events)

    expected_remaining = ["robo", "botanic", "robot", "abot"]
    filtered_usernames = [e.actor_username for e in filtered_events]

    assert len(filtered_events) == 4
    for username in expected_remaining:
        assert username in filtered_usernames


def test_create_pr_metrics_bot_detection_in_review_events():
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    pr = get_pull_request(state=PullRequestState.MERGED, created_at=t1, updated_at=t1)

    bot_reviewers = [
        "github-actions[bot]",
        "dependabot-preview[bot]",
        "Jenkins_Bot",
        "ci_bot_service",
        "bot_reviewer",
        "tool-bot-123",
        "_bot_helper",
        "helper_bot",
    ]

    bot_events = []
    for i, reviewer in enumerate(bot_reviewers):
        bot_events.append(
            get_pull_request_event(
                pull_request_id=pr.id,
                reviewer=reviewer,
                state=PullRequestEventState.COMMENTED.value,
                created_at=t1 + timedelta(minutes=i + 1),
            )
        )

    human_event = get_pull_request_event(
        pull_request_id=pr.id,
        reviewer="human_reviewer",
        state=PullRequestEventState.APPROVED.value,
        created_at=t1 + timedelta(hours=1),
    )

    all_events = bot_events + [human_event]

    pr_metrics = pr_service.create_pr_metrics(pr, all_events, [])

    assert len(pr_metrics.reviewers) == 1
    assert "human_reviewer" in pr_metrics.reviewers

    for bot_reviewer in bot_reviewers:
        assert bot_reviewer not in pr_metrics.reviewers


def test_cycle_time_uses_ready_for_review_when_available():
    """Test that cycle time uses first ready_for_review event as start time when available."""
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=2)
    t3 = t2 + timedelta(days=1)

    pr = get_pull_request(
        state=PullRequestState.MERGED, created_at=t1, state_changed_at=t3, updated_at=t3
    )

    ready_for_review_event = get_pull_request_event(
        pull_request_id=pr.id,
        type=PullRequestEventType.READY_FOR_REVIEW.value,
        created_at=t2,
    )

    performance = pr_service.get_pr_performance(pr, [ready_for_review_event])

    assert performance.cycle_time == 86400


def test_cycle_time_falls_back_to_created_at_when_no_ready_for_review():
    """Test that cycle time uses PR creation time when no ready_for_review events exist."""
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(days=1)

    pr = get_pull_request(
        state=PullRequestState.MERGED, created_at=t1, state_changed_at=t2, updated_at=t2
    )

    performance = pr_service.get_pr_performance(pr, [])

    assert performance.cycle_time == 86400


def test_cycle_time_uses_earliest_ready_for_review_when_multiple():
    """Test that cycle time uses the earliest ready_for_review event when multiple exist."""
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=1)
    t3 = t1 + timedelta(hours=3)
    t4 = t1 + timedelta(days=1)

    pr = get_pull_request(
        state=PullRequestState.MERGED, created_at=t1, state_changed_at=t4, updated_at=t4
    )

    ready_for_review_1 = get_pull_request_event(
        pull_request_id=pr.id,
        type=PullRequestEventType.READY_FOR_REVIEW.value,
        created_at=t2,
    )

    ready_for_review_2 = get_pull_request_event(
        pull_request_id=pr.id,
        type=PullRequestEventType.READY_FOR_REVIEW.value,
        created_at=t3,
    )

    performance = pr_service.get_pr_performance(
        pr, [ready_for_review_2, ready_for_review_1]
    )

    assert performance.cycle_time == 82800


def test_first_response_time_uses_ready_for_review_when_available():
    """Test that first response time uses ready_for_review as start time when available."""
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=2)
    t3 = t2 + timedelta(hours=1)

    pr = get_pull_request(created_at=t1, updated_at=t1)

    ready_for_review_event = get_pull_request_event(
        pull_request_id=pr.id,
        type=PullRequestEventType.READY_FOR_REVIEW.value,
        created_at=t2,
    )

    review_event = get_pull_request_event(
        pull_request_id=pr.id, type=PullRequestEventType.REVIEW.value, created_at=t3
    )

    performance = pr_service.get_pr_performance(
        pr, [ready_for_review_event, review_event]
    )
    assert performance.first_review_time == 3600


def test_first_response_time_falls_back_to_created_at_when_no_ready_for_review():
    """Test that first response time uses PR creation time when no ready_for_review events exist."""
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(hours=3)
    pr = get_pull_request(created_at=t1, updated_at=t1)

    review_event = get_pull_request_event(
        pull_request_id=pr.id, type=PullRequestEventType.REVIEW.value, created_at=t2
    )

    performance = pr_service.get_pr_performance(pr, [review_event])
    assert performance.first_review_time == 10800


def test_cycle_time_ready_for_review_with_draft_pr_workflow():
    """Test cycle time calculation for draft PR workflow with ready_for_review event."""
    pr_service = CodeETLAnalyticsService()
    t1 = time_now()
    t2 = t1 + timedelta(days=2)  # ready for review 2 days after creation (draft period)
    t3 = t2 + timedelta(hours=4)  # first review
    t4 = t2 + timedelta(days=1)  # merged

    pr = get_pull_request(
        state=PullRequestState.MERGED, created_at=t1, state_changed_at=t4, updated_at=t4
    )

    ready_for_review_event = get_pull_request_event(
        pull_request_id=pr.id,
        type=PullRequestEventType.READY_FOR_REVIEW.value,
        created_at=t2,
    )

    review_event = get_pull_request_event(
        pull_request_id=pr.id, type=PullRequestEventType.REVIEW.value, created_at=t3
    )

    performance = pr_service.get_pr_performance(
        pr, [ready_for_review_event, review_event]
    )

    assert performance.cycle_time == 86400
    assert performance.first_review_time == 14400
