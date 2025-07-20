import re
from datetime import datetime
from typing import List, Set, Dict, Optional

from mhq.store.models.code import (
    PullRequest,
    PullRequestRevertPRMapping,
    PullRequestRevertPRMappingActorType,
)
from mhq.store.repos.code import CodeRepoService
from mhq.utils.time import time_now


class RevertPRsBitbucketSyncHandler:
    def __init__(
        self,
        code_repo_service: CodeRepoService,
    ):
        self.code_repo_service = code_repo_service

    def __call__(self, *args, **kwargs):
        return self.process_revert_prs(*args, **kwargs)

    def process_revert_prs(
        self, prs: List[PullRequest]
    ) -> List[PullRequestRevertPRMapping]:
        revert_prs: List[PullRequest] = []
        original_prs: List[PullRequest] = []

        for pr in prs:
            pr_number = (
                self._get_revert_pr_number(pr.head_branch) if pr.head_branch else None
            )
            if pr_number is None:
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
        by taking repo_id and the pr_number and searching for the
        string 'revert-[pr-number]' in the head branch.
        """

        repo_ids: Set[str] = set()
        repo_id_to_pr_number_to_id_map: Dict[str, Dict[str, str]] = {}
        pr_numbers_match_strings: List[str] = []

        for pr in prs:
            pr_numbers_match_strings.append(f"revert-{pr.number}")
            repo_ids.add(str(pr.repo_id))

            if str(pr.repo_id) not in repo_id_to_pr_number_to_id_map:
                repo_id_to_pr_number_to_id_map[str(pr.repo_id)] = {}

            repo_id_to_pr_number_to_id_map[str(pr.repo_id)][str(pr.number)] = pr.id

        if len(pr_numbers_match_strings) == 0:
            return []

        revert_prs: List[PullRequest] = (
            self.code_repo_service.get_prs_by_head_branch_match_strings(
                list(repo_ids), pr_numbers_match_strings
            )
        )

        revert_pr_mappings: List[PullRequestRevertPRMapping] = []

        for rev_pr in revert_prs:
            original_pr_number = self._get_revert_pr_number(rev_pr.head_branch)
            if original_pr_number is None:
                continue

            repo_key_exists = repo_id_to_pr_number_to_id_map.get(str(rev_pr.repo_id))
            if repo_key_exists is None:
                continue

            original_pr_id = repo_id_to_pr_number_to_id_map[str(rev_pr.repo_id)].get(
                str(original_pr_number)
            )
            if original_pr_id is None:
                continue

            revert_pr_mp = PullRequestRevertPRMapping()
            revert_pr_mp.pr_id = rev_pr.id
            revert_pr_mp.actor_type = PullRequestRevertPRMappingActorType.SYSTEM
            revert_pr_mp.actor = None
            revert_pr_mp.reverted_pr = original_pr_id
            revert_pr_mp.updated_at = time_now()
            revert_pr_mappings.append(revert_pr_mp)

        return revert_pr_mappings

    def _get_revert_pr_mapping_for_revert_prs(
        self, prs: List[PullRequest]
    ) -> List[PullRequestRevertPRMapping]:
        """
        This function takes a list of pull requests and for each pull request
        checks if it is a revert pr or not. If it is a revert pr it tries to
        create a mapping of that revert pr with the reverted pr and then returns
        a list of those mappings
        """

        revert_pr_numbers: List[str] = []
        repo_ids: Set[str] = set()
        repo_id_to_pr_number_to_id_map: Dict[str, Dict[str, str]] = {}

        for pr in prs:
            revert_pr_number = self._get_revert_pr_number(pr.head_branch)
            if revert_pr_number is None:
                continue

            revert_pr_numbers.append(str(revert_pr_number))
            repo_ids.add(str(pr.repo_id))

            if str(pr.repo_id) not in repo_id_to_pr_number_to_id_map:
                repo_id_to_pr_number_to_id_map[str(pr.repo_id)] = {}

            repo_id_to_pr_number_to_id_map[str(pr.repo_id)][
                str(revert_pr_number)
            ] = pr.id

        if len(revert_pr_numbers) == 0:
            return []

        reverted_prs: List[PullRequest] = (
            self.code_repo_service.get_reverted_prs_by_numbers(
                list(repo_ids), revert_pr_numbers
            )
        )

        revert_pr_mappings: List[PullRequestRevertPRMapping] = []
        for rev_pr in reverted_prs:
            repo_key_exists = repo_id_to_pr_number_to_id_map.get(str(rev_pr.repo_id))
            if repo_key_exists is None:
                continue

            original_pr_id = repo_id_to_pr_number_to_id_map[str(rev_pr.repo_id)].get(
                str(rev_pr.number)
            )
            if original_pr_id is None:
                continue

            revert_pr_mp = PullRequestRevertPRMapping()
            revert_pr_mp.pr_id = original_pr_id
            revert_pr_mp.actor_type = PullRequestRevertPRMappingActorType.SYSTEM
            revert_pr_mp.actor = None
            revert_pr_mp.reverted_pr = rev_pr.id
            revert_pr_mp.updated_at = time_now()
            revert_pr_mappings.append(revert_pr_mp)

        return revert_pr_mappings

    def _get_revert_pr_number(self, branch_name: str) -> Optional[int]:
        """
        Extract the PR number from revert branch names.
        Common patterns:
        - revert-123-feature-branch
        - revert-pr-123
        - revert-feature-branch-123
        """
        if not branch_name:
            return None
            
        # Pattern to match revert branches (similar to GitHub)
        pattern = r"revert-(\d+)-\w+"

        match = re.search(pattern, branch_name.lower())
        if match:
            try:
                return int(match.group(1))
            except (ValueError, IndexError):
                pass
        
        return None


def get_revert_prs_bitbucket_sync_handler() -> RevertPRsBitbucketSyncHandler:
    return RevertPRsBitbucketSyncHandler(CodeRepoService())
