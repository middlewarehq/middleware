from datetime import datetime
from mhq.store.models.code.enums import PullRequestState
from mhq.store.models.code.pull_requests import PullRequest, PullRequestRevertPRMapping
from mhq.service.code.sync.revert_pr_gitlab_sync import RevertPRsGitlabSyncHandler


def test_get_revert_merge_commit_hash():
    class FakeCodeRepoService:
        pass

    handler = RevertPRsGitlabSyncHandler(FakeCodeRepoService())

    assert handler.get_revert_merge_commit_hash("revert-12345678") == "12345678"
    assert handler.get_revert_merge_commit_hash("revert-abcdef12") == "abcdef12"
    assert handler.get_revert_merge_commit_hash("not-a-revert-branch") is None
    assert handler.get_revert_merge_commit_hash("revert-123") is None
    assert handler.get_revert_merge_commit_hash("revert-1234567890abcdef") == None


def test_process_revert_prs_empty_list():
    class FakeCodeRepoService:
        def get_reverted_prs_by_merge_commit_hash(self, repo_ids, merge_commit_hashes):
            return []

    handler = RevertPRsGitlabSyncHandler(FakeCodeRepoService())
    result = handler.process_revert_prs([])
    assert result == []


def test_process_revert_prs_no_revert_prs():
    class FakeCodeRepoService:
        def get_prs_by_head_branch_match_strings(self, repo_ids, match_strings):
            return []

        def get_reverted_prs_by_merge_commit_hash(self, repo_ids, merge_commit_hashes):
            return []

    handler = RevertPRsGitlabSyncHandler(FakeCodeRepoService())
    prs = [
        PullRequest(
            id="1",
            repo_id="repo1",
            head_branch="feature-branch",
            state=PullRequestState.MERGED,
            merge_commit_sha="abcde11234567890",
        ),
        PullRequest(
            id="2",
            repo_id="repo1",
            head_branch="another-branch",
            state=PullRequestState.MERGED,
            merge_commit_sha="1234567890abcdef",
        ),
    ]

    result = handler.process_revert_prs(prs)
    assert result == []


def test_process_revert_prs_with_revert_prs():
    class FakeCodeRepoService:
        def get_reverted_prs_by_merge_commit_hash(self, repo_ids, merge_commit_hashes):
            return [
                PullRequest(
                    id="2",
                    repo_id="repo1",
                    head_branch="feature-branch",
                    state=PullRequestState.MERGED,
                    merge_commit_sha="abcdef1234567890",
                )
            ]

        def get_prs_by_head_branch_match_strings(self, repo_ids, match_strings):
            return []

    handler = RevertPRsGitlabSyncHandler(FakeCodeRepoService())
    prs = [
        PullRequest(
            id="1",
            repo_id="repo1",
            head_branch="revert-abcdef12",
            state=PullRequestState.MERGED,
            merge_commit_sha="1234567890abcdef",
        ),
        PullRequest(
            id="2",
            repo_id="repo1",
            head_branch="feature-branch",
            state=PullRequestState.MERGED,
            merge_commit_sha="abcdef1234567890",
        ),
    ]

    result = handler.process_revert_prs(prs)
    assert len(result) == 1
    assert isinstance(result[0], PullRequestRevertPRMapping)
    assert result[0].pr_id == "1"
    assert result[0].reverted_pr == "2"


def test_process_revert_prs_with_original_pr():
    class FakeCodeRepoService:
        def get_reverted_prs_by_merge_commit_hash(self, repo_ids, merge_commit_hashes):
            return []

        def get_prs_by_head_branch_match_strings(self, repo_ids, match_strings):
            return [
                PullRequest(
                    id="1",
                    repo_id="repo1",
                    head_branch="revert-abcdef12",
                    state=PullRequestState.MERGED,
                    merge_commit_sha="1234567890abcdef",
                )
            ]

    handler = RevertPRsGitlabSyncHandler(FakeCodeRepoService())
    prs = [
        PullRequest(
            id="1",
            repo_id="repo1",
            head_branch="revert-abcdef12",
            state=PullRequestState.MERGED,
            merge_commit_sha="1234567890abcdef",
        ),
        PullRequest(
            id="2",
            repo_id="repo1",
            head_branch="feature-branch",
            state=PullRequestState.MERGED,
            merge_commit_sha="abcdef1234567890",
        ),
    ]

    result = handler.process_revert_prs(prs)
    assert len(result) == 1
    assert isinstance(result[0], PullRequestRevertPRMapping)
    assert result[0].pr_id == "1"
    assert result[0].reverted_pr == "2"


def test_process_revert_prs_datetime():
    class FakeCodeRepoService:
        def get_reverted_prs_by_merge_commit_hash(self, repo_ids, merge_commit_hashes):
            return [
                PullRequest(
                    id="2", repo_id="repo1", merge_commit_sha="abcdef1234567890"
                )
            ]

        def get_prs_by_head_branch_match_strings(self, repo_ids, match_strings):
            return []

    handler = RevertPRsGitlabSyncHandler(FakeCodeRepoService())
    prs = [
        PullRequest(
            id="1",
            repo_id="repo1",
            head_branch="revert-abcdef12",
            state=PullRequestState.MERGED,
            merge_commit_sha="1234567890abcdef",
        ),
    ]

    result = handler.process_revert_prs(prs)
    assert len(result) == 1
    assert isinstance(result[0].updated_at, datetime)


def test_get_revert_pr_mapping_for_original_prs_non_merged():
    class FakeCodeRepoService:
        pass

    handler = RevertPRsGitlabSyncHandler(FakeCodeRepoService())
    prs = [
        PullRequest(
            id="1",
            repo_id="repo1",
            head_branch="feature-branch",
            state=PullRequestState.OPEN,
            merge_commit_sha="abcdef1234567890",
        ),
    ]

    result = handler._get_revert_pr_mapping_for_original_prs(prs)
    assert result == []


def test_process_revert_prs_with_no_mappings_found():
    class FakeCodeRepoService:
        def get_reverted_prs_by_merge_commit_hash(self, repo_ids, merge_commit_hashes):
            return []

        def get_prs_by_head_branch_match_strings(self, repo_ids, match_strings):
            return []

    handler = RevertPRsGitlabSyncHandler(FakeCodeRepoService())
    prs = [
        PullRequest(
            id="1",
            repo_id="repo1",
            head_branch="revert-abcdef12",
            state=PullRequestState.MERGED,
            merge_commit_sha="1234567890abcdef",
        ),
        PullRequest(
            id="2",
            repo_id="repo1",
            head_branch="feature-branch",
            state=PullRequestState.MERGED,
            merge_commit_sha="abcdef1234567890",
        ),
    ]

    result = handler.process_revert_prs(prs)
    assert result == []


def test_process_revert_prs_with_duplicate_mappings():
    class FakeCodeRepoService:
        def get_reverted_prs_by_merge_commit_hash(self, repo_ids, merge_commit_hashes):
            return [
                PullRequest(
                    id="2",
                    repo_id="repo1",
                    head_branch="feature-branch",
                    state=PullRequestState.MERGED,
                    merge_commit_sha="abcdef1234567890",
                )
            ]

        def get_prs_by_head_branch_match_strings(self, repo_ids, match_strings):
            return [
                PullRequest(
                    id="1",
                    repo_id="repo1",
                    head_branch="revert-abcdef12",
                    state=PullRequestState.MERGED,
                    merge_commit_sha="1234567890abcdef",
                )
            ]

    handler = RevertPRsGitlabSyncHandler(FakeCodeRepoService())
    prs = [
        PullRequest(
            id="1",
            repo_id="repo1",
            head_branch="revert-abcdef12",
            state=PullRequestState.MERGED,
            merge_commit_sha="1234567890abcdef",
        ),
        PullRequest(
            id="2",
            repo_id="repo1",
            head_branch="feature-branch",
            state=PullRequestState.MERGED,
            merge_commit_sha="abcdef1234567890",
        ),
    ]

    result = handler.process_revert_prs(prs)
    assert len(result) == 1
    assert isinstance(result[0], PullRequestRevertPRMapping)
    assert result[0].pr_id == "1"
    assert result[0].reverted_pr == "2"
