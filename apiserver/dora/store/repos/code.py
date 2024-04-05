from operator import and_
from typing import Optional, List

from sqlalchemy import or_
from sqlalchemy.orm import defer

from dora.store import rollback_on_exc, session
from dora.store.models.code import PullRequest, PullRequestEvent, OrgRepo, PullRequestRevertPRMapping


class CodeRepoService:

    @rollback_on_exc
    def get_repo_by_id(self, repo_id: str) -> Optional[OrgRepo]:
        return session.query(OrgRepo).filter(OrgRepo.id == repo_id).one_or_none()

    @rollback_on_exc
    def get_repo_pr_by_number(self, repo_id: str, pr_number) -> Optional[PullRequest]:
        return (
            session.query(PullRequest)
            .options(defer("data"))
            .filter(
                and_(
                    PullRequest.repo_id == repo_id, PullRequest.number == str(pr_number)
                )
            )
            .one_or_none()
        )

    @rollback_on_exc
    def get_pr_events(self, pr_model: PullRequest):
        if not pr_model:
            return []

        pr_events = (
            session.query(PullRequestEvent)
            .options(defer("data"))
            .filter(PullRequestEvent.pull_request_id == pr_model.id)
            .all()
        )
        return pr_events

    @rollback_on_exc
    def get_prs_by_pr_ids(self, pr_ids: List[str]):
        query = (
            session.query(PullRequest)
            .options(defer(PullRequest.data))
            .filter(PullRequest.id.in_(pr_ids))
        )
        return query.all()

    @rollback_on_exc
    def get_prs_by_head_branch_match_strings(
            self, repo_ids: List[str], match_strings: List[str]
    ) -> List[PullRequest]:
        query = (
            session.query(PullRequest)
            .options(defer("data"))
            .filter(
                and_(
                    PullRequest.repo_id.in_(repo_ids),
                    or_(
                        *[
                            PullRequest.head_branch.ilike(f"{match_string}%")
                            for match_string in match_strings
                        ]
                    ),
                )
            )
            .order_by(PullRequest.updated_in_db_at.desc())
        )

        return query.all()

    @rollback_on_exc
    def get_reverted_prs_by_numbers(
            self, repo_ids: List[str], numbers: List[str]
    ) -> List[PullRequest]:
        query = (
            session.query(PullRequest)
            .options(defer("data"))
            .filter(
                and_(
                    PullRequest.repo_id.in_(repo_ids),
                    PullRequest.number.in_(numbers),
                )
            )
            .order_by(PullRequest.updated_in_db_at.desc())
        )

        return query.all()

    @rollback_on_exc
    def save_revert_pr_mappings(
            self, revert_pr_mappings: List[PullRequestRevertPRMapping]
    ):
        [session.merge(revert_pr_map) for revert_pr_map in revert_pr_mappings]
        session.commit()
