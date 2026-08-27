from uuid import uuid4

from mhq.service.code.sync.revert_prs_bitbucket_sync import (
    RevertPRsBitbucketSyncHandler,
)
from mhq.store.models.code import PullRequestState


class _PR:
    def __init__(
        self, number, head_branch, state=PullRequestState.MERGED, repo_id=None
    ):
        self.id = uuid4()
        self.number = number
        self.head_branch = head_branch
        self.state = state
        self.repo_id = repo_id or uuid4()


class FakeCodeRepoService:
    def __init__(self, prs_by_number=None, prs_by_branch=None):
        self._by_number = prs_by_number or {}
        self._by_branch = prs_by_branch or []

    def get_repo_pr_by_number(self, repo_id, number):
        return self._by_number.get(int(number))

    def get_prs_by_head_branch_match_strings(self, repo_ids, match_strings):
        return [pr for pr in self._by_branch if pr.head_branch in match_strings]


def test_a_revert_branch_maps_to_the_original_pr():
    repo_id = uuid4()
    original = _PR(42, "feat/rate-limiter", repo_id=repo_id)
    revert = _PR(57, "revert-pr-42", repo_id=repo_id)
    handler = RevertPRsBitbucketSyncHandler(
        FakeCodeRepoService(prs_by_number={42: original})
    )

    mappings = handler.process_revert_prs([revert])

    assert len(mappings) == 1
    assert mappings[0].pr_id == revert.id
    assert mappings[0].reverted_pr == original.id


def test_an_original_pr_finds_its_earlier_synced_revert():
    repo_id = uuid4()
    original = _PR(42, "feat/rate-limiter", repo_id=repo_id)
    stored_revert = _PR(57, "revert-pr-42", repo_id=repo_id)
    handler = RevertPRsBitbucketSyncHandler(
        FakeCodeRepoService(prs_by_branch=[stored_revert])
    )

    mappings = handler.process_revert_prs([original])

    assert len(mappings) == 1
    assert mappings[0].pr_id == stored_revert.id
    assert mappings[0].reverted_pr == original.id


def test_a_pr_merely_about_reverting_maps_to_nothing():
    # CLUSTOX: the negative case a branch/title heuristic must carry. A PR
    # discussing reverts, or a hand-named branch, is not a revert marker --
    # a false mapping here becomes a false CFR incident.
    prose = _PR(60, "chore/revert-the-tabs-decision")
    titled = _PR(61, "revert-pr-abc")
    handler = RevertPRsBitbucketSyncHandler(FakeCodeRepoService())

    assert handler.process_revert_prs([prose, titled]) == []


def test_a_revert_of_an_unsynced_original_maps_to_nothing():
    revert = _PR(57, "revert-pr-42")
    handler = RevertPRsBitbucketSyncHandler(FakeCodeRepoService())

    assert handler.process_revert_prs([revert]) == []


def test_unmerged_originals_are_not_searched_for_reverts():
    open_pr = _PR(42, "feat/x", state=PullRequestState.OPEN)
    handler = RevertPRsBitbucketSyncHandler(
        FakeCodeRepoService(prs_by_branch=[_PR(57, "revert-pr-42")])
    )

    assert handler.process_revert_prs([open_pr]) == []
