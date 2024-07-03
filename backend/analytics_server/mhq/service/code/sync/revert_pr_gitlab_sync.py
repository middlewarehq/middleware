import re
from datetime import datetime
from typing import Dict, List, Optional, Set
from mhq.store.models.code.enums import (
    PullRequestRevertPRMappingActorType,
    PullRequestState,
)
from mhq.store.models.code.pull_requests import PullRequest, PullRequestRevertPRMapping
from mhq.store.repos.code import CodeRepoService


class RevertPRsGitlabSyncHandler:
    def __init__(self, code_repo_service: CodeRepoService):
        self.code_repo_service = code_repo_service

    def __call__(self, *args, **kwargs):
        return self.process_revert_prs(*args, **kwargs)

    def process_revert_prs(
        self, prs: List[PullRequest]
    ) -> List[PullRequestRevertPRMapping]:
        revert_prs: List[PullRequest] = []
        original_prs: List[PullRequest] = []

        for pr in prs:
            pr_merge_commit_sha = (
                self.get_revert_merge_commit_hash(pr.head_branch)
                if pr.head_branch
                else None
            )
            if pr_merge_commit_sha is None:
                original_prs.append(pr)
            else:
                revert_prs.append(pr)

        mappings_of_revert_prs = self._get_revert_pr_mapping_for_revert_prs(revert_prs)
        mappings_of_original_prs = self._get_revert_pr_mapping_for_original_prs(
            original_prs
        )
        revert_pr_mappings = set(mappings_of_original_prs + mappings_of_revert_prs)

        return list(revert_pr_mappings)

    def _get_revert_pr_mapping_for_original_prs(
        self, prs: List[PullRequest]
    ) -> List[PullRequestRevertPRMapping]:
        """
        This function takes a list of PRs and for each PR it tries to
        find if that pr has been reverted and by which PR. It is done
        by taking repo_id and the merge commit hash and searching for
        the string 'revert-[merge-commit-hash]' in the head branch.
        """

        repo_ids: Set[str] = set()
        repo_id_to_pr_merge_hash_to_revert_pr_id_map: Dict[str, Dict[str, str]] = {}
        pr_merge_hash_match_strings: List[str] = []

        for pr in prs:
            if pr.state != PullRequestState.MERGED:
                continue

            pr_merge_hash_match_strings.append(f"revert-{pr.merge_commit_sha[:8]}")
            repo_ids.add(str(pr.repo_id))

            if str(pr.repo_id) not in repo_id_to_pr_merge_hash_to_revert_pr_id_map:
                repo_id_to_pr_merge_hash_to_revert_pr_id_map[str(pr.repo_id)] = {}

            repo_id_to_pr_merge_hash_to_revert_pr_id_map[str(pr.repo_id)][
                str(pr.merge_commit_sha[:8])
            ] = pr.id

        if len(pr_merge_hash_match_strings) == 0:
            return []

        revert_prs: List[PullRequest] = (
            self.code_repo_service.get_prs_by_head_branch_match_strings(
                list(repo_ids), pr_merge_hash_match_strings
            )
        )

        revert_pr_mappings: List[PullRequestRevertPRMapping] = []

        for rev_pr in revert_prs:
            merge_commit_hash = self.get_revert_merge_commit_hash(rev_pr.head_branch)
            if merge_commit_hash is None:
                continue

            repo_key_exists = repo_id_to_pr_merge_hash_to_revert_pr_id_map.get(
                str(rev_pr.repo_id)
            )
            if repo_key_exists is None:
                continue

            original_pr_id = repo_id_to_pr_merge_hash_to_revert_pr_id_map[
                str(rev_pr.repo_id)
            ].get(merge_commit_hash)
            if original_pr_id is None:
                continue

            revert_pr_mp = PullRequestRevertPRMapping(
                pr_id=rev_pr.id,
                actor_type=PullRequestRevertPRMappingActorType.SYSTEM,
                actor=None,
                reverted_pr=original_pr_id,
                updated_at=datetime.now(),
            )
            revert_pr_mappings.append(revert_pr_mp)

        return revert_pr_mappings

    def _get_revert_pr_mapping_for_revert_prs(
        self, prs: List[PullRequest]
    ) -> List[PullRequestRevertPRMapping]:
        """
        This function takes a list of PRs and for each PR it tries to
        find if that pr is a revert PR and for that revert PR it tries
        to find the original which was reverted and create a mapping.
        """
        revert_pr_hashes: List[str] = []
        repo_ids: Set[str] = set()
        repo_id_to_pr_merge_hash_to_revert_pr_id_map: Dict[str, Dict[str, str]] = {}

        for pr in prs:
            revert_pr_merge_commit_hash = self.get_revert_merge_commit_hash(
                pr.head_branch
            )
            if revert_pr_merge_commit_hash is None:
                continue

            revert_pr_hashes.append(revert_pr_merge_commit_hash)
            repo_ids.add(str(pr.repo_id))

            if str(pr.repo_id) not in repo_id_to_pr_merge_hash_to_revert_pr_id_map:
                repo_id_to_pr_merge_hash_to_revert_pr_id_map[str(pr.repo_id)] = {}

            repo_id_to_pr_merge_hash_to_revert_pr_id_map[str(pr.repo_id)][
                str(revert_pr_merge_commit_hash)
            ] = pr.id

            if len(revert_pr_hashes) == 0:
                return []

        reverted_prs: List[PullRequest] = (
            self.code_repo_service.get_reverted_prs_by_merge_commit_hash(
                list(repo_ids), revert_pr_hashes
            )
        )

        revert_pr_mappings: List[PullRequestRevertPRMapping] = []
        for rev_pr in reverted_prs:
            repo_key_exists = repo_id_to_pr_merge_hash_to_revert_pr_id_map.get(
                str(rev_pr.repo_id)
            )
            if repo_key_exists is None:
                continue

            commit_hash = rev_pr.merge_commit_sha[:8]
            original_pr_id = repo_id_to_pr_merge_hash_to_revert_pr_id_map[
                str(rev_pr.repo_id)
            ].get(commit_hash)
            if original_pr_id is None:
                continue

            revert_pr_mp = PullRequestRevertPRMapping(
                pr_id=original_pr_id,
                actor_type=PullRequestRevertPRMappingActorType.SYSTEM,
                actor=None,
                reverted_pr=rev_pr.id,
                updated_at=datetime.now(),
            )
            revert_pr_mappings.append(revert_pr_mp)

        return revert_pr_mappings

    def get_revert_merge_commit_hash(self, head_branch: str) -> Optional[str]:
        """
        Function to match the regex pattern "revert-pr-[merge_commit_hash]" and
        return the merge_commit hash for Gitlab. The commit hash will be at least
        8 characters and at most 40 characters long
        """
        pattern = r"^revert-([a-fA-F0-9]{8})$"

        matches = re.findall(pattern, head_branch)

        if matches:
            return matches[-1]
        else:
            return None


def get_revert_prs_gitlab_sync_handler() -> RevertPRsGitlabSyncHandler:
    return RevertPRsGitlabSyncHandler(CodeRepoService())
