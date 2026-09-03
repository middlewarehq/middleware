import re
from typing import Dict, List, Optional, Set

from mhq.store.models.code.enums import (
    PullRequestRevertPRMappingActorType,
    PullRequestState,
)
from mhq.store.models.code.pull_requests import (
    PullRequest,
    PullRequestRevertPRMapping,
)
from mhq.store.repos.code import CodeRepoService
from mhq.utils.time import time_now

# CLUSTOX: Bitbucket's own "Revert" button creates the branch
# `revert-pr-<number>` -- a structured link to the original PR's number in the
# same repo. This is a STRONGER signal than the title-prefix heuristic the
# spec originally proposed: a title alone identifies a PR as "a revert" but
# names no target, and a mapping without both ends is useless to CFR. A
# manual revert from a hand-named branch goes undetected -- accepted, and
# recorded in the spec.
REVERT_BRANCH_PATTERN = re.compile(r"^revert-pr-(\d+)$")


class RevertPRsBitbucketSyncHandler:
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
            if pr.head_branch and REVERT_BRANCH_PATTERN.match(pr.head_branch):
                revert_prs.append(pr)
            else:
                original_prs.append(pr)

        mappings = self._mappings_for_revert_prs(
            revert_prs
        ) + self._mappings_for_original_prs(original_prs)
        return list(set(mappings))

    def _mappings_for_revert_prs(
        self, prs: List[PullRequest]
    ) -> List[PullRequestRevertPRMapping]:
        """A revert PR in this batch names its original by number; the
        original may have synced in any earlier batch, so it is looked up in
        the store rather than in the batch."""
        mappings: List[PullRequestRevertPRMapping] = []

        for pr in prs:
            reverted_number = self.get_reverted_pr_number(pr.head_branch)
            if reverted_number is None:
                continue

            original_pr: Optional[PullRequest] = (
                self.code_repo_service.get_repo_pr_by_number(
                    str(pr.repo_id), reverted_number
                )
            )
            if original_pr is None:
                continue

            mappings.append(
                PullRequestRevertPRMapping(
                    pr_id=pr.id,
                    actor_type=PullRequestRevertPRMappingActorType.SYSTEM,
                    actor=None,
                    reverted_pr=original_pr.id,
                    updated_at=time_now(),
                )
            )

        return mappings

    def _mappings_for_original_prs(
        self, prs: List[PullRequest]
    ) -> List[PullRequestRevertPRMapping]:
        """The mirror direction: an original PR syncing now may already have
        been reverted by a PR from an earlier batch."""
        merged_prs = [pr for pr in prs if pr.state == PullRequestState.MERGED]
        if not merged_prs:
            return []

        repo_ids: Set[str] = {str(pr.repo_id) for pr in merged_prs}
        match_strings = [f"revert-pr-{pr.number}" for pr in merged_prs]
        number_by_repo: Dict[str, Dict[str, str]] = {}
        for pr in merged_prs:
            number_by_repo.setdefault(str(pr.repo_id), {})[str(pr.number)] = pr.id

        revert_prs: List[PullRequest] = (
            self.code_repo_service.get_prs_by_head_branch_match_strings(
                list(repo_ids), match_strings
            )
        )

        mappings: List[PullRequestRevertPRMapping] = []
        for revert_pr in revert_prs:
            reverted_number = self.get_reverted_pr_number(revert_pr.head_branch)
            if reverted_number is None:
                continue
            original_pr_id = number_by_repo.get(str(revert_pr.repo_id), {}).get(
                str(reverted_number)
            )
            if original_pr_id is None:
                continue
            mappings.append(
                PullRequestRevertPRMapping(
                    pr_id=revert_pr.id,
                    actor_type=PullRequestRevertPRMappingActorType.SYSTEM,
                    actor=None,
                    reverted_pr=original_pr_id,
                    updated_at=time_now(),
                )
            )

        return mappings

    @staticmethod
    def get_reverted_pr_number(head_branch: Optional[str]) -> Optional[int]:
        if not head_branch:
            return None
        match = REVERT_BRANCH_PATTERN.match(head_branch)
        return int(match.group(1)) if match else None


def get_revert_prs_bitbucket_sync_handler() -> RevertPRsBitbucketSyncHandler:
    return RevertPRsBitbucketSyncHandler(CodeRepoService())
