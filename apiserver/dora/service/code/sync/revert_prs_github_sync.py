import re
from datetime import datetime
from typing import List, Set, Dict, Optional

from dora.store.models.code import OrgRepo, PullRequest, PullRequestRevertPRMapping, PullRequestRevertPRMappingActorType
from dora.store.repos.code import CodeRepoService
from dora.utils.time import time_now


class ReverPRsGitHubSync:
    MAX_RETRIES = 3
    RETRY_DELAY_SECONDS = 2

    def __init__(self, org_repo: OrgRepo, prs: List[PullRequest], code_repo_service: CodeRepoService):
        self.org_repo = org_repo
        self.repo_id = str(org_repo.id)
        self.org_name = org_repo.org_name
        self.repo_name = org_repo.name
        self.prs = prs
        self.code_repo_service = code_repo_service

    def process_revert_prs(self):
        revert_prs: List[PullRequest] = []
        original_prs: List[PullRequest] = []

        for pr in self.prs:
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

        revert_prs: List[
            PullRequest
        ] = self.code_repo_service.get_prs_by_head_branch_match_strings(
            list(repo_ids), pr_numbers_match_strings
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
                original_pr_number
            )
            if original_pr_id is None:
                continue

            revert_pr_mp = PullRequestRevertPRMapping(
                pr_id=rev_pr.id,
                actor_type=PullRequestRevertPRMappingActorType.SYSTEM,
                actor=None,
                reverted_pr=original_pr_id,
                updated_at=time_now(),
            )
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

            revert_pr_numbers.append(revert_pr_number)
            repo_ids.add(str(pr.repo_id))

            if str(pr.repo_id) not in repo_id_to_pr_number_to_id_map:
                repo_id_to_pr_number_to_id_map[str(pr.repo_id)] = {}

            repo_id_to_pr_number_to_id_map[str(pr.repo_id)][
                str(revert_pr_number)
            ] = pr.id

        if len(revert_pr_numbers) == 0:
            return []

        reverted_prs: List[PullRequest] = self.code_repo_service.get_reverted_prs_by_numbers(
            list(repo_ids), revert_pr_numbers
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

            revert_pr_mp = PullRequestRevertPRMapping(
                pr_id=original_pr_id,
                actor_type=PullRequestRevertPRMappingActorType.SYSTEM,
                actor=None,
                reverted_pr=rev_pr.id,
                updated_at=datetime.now(),
            )
            revert_pr_mappings.append(revert_pr_mp)

        return revert_pr_mappings

    def _get_revert_pr_number(self, head_branch: str) -> Optional[str]:
        """
        Function to match the regex pattern "revert-[pr-num]-[branch-name]" and
        return the PR number for GitHub.
        """
        pattern = r"revert-(\d+)-\w+"

        match = re.search(pattern, head_branch)

        if match:
            pr_num = match.group(1)
            return pr_num
        else:
            return None
