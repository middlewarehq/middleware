from operator import and_
from typing import Optional, List

from sqlalchemy import or_
from sqlalchemy.orm import defer
from dora.utils.time import Interval

from dora.store import rollback_on_exc, session
from dora.store.models.code import (
    PullRequest,
    PullRequestEvent,
    OrgRepo,
    PullRequestRevertPRMapping,
    PullRequestCommit,
    Bookmark,
    TeamRepos,
    PullRequestState,
    PRFilter,
)


class CodeRepoService:
    @rollback_on_exc
    def get_active_org_repos(self, org_id: str) -> List[OrgRepo]:
        return (
            session.query(OrgRepo)
            .filter(OrgRepo.org_id == org_id, OrgRepo.is_active.is_(True))
            .all()
        )

    @rollback_on_exc
    def update_org_repos(self, org_repos: List[OrgRepo]):
        [session.merge(org_repo) for org_repo in org_repos]
        session.commit()

    @rollback_on_exc
    def save_pull_requests_data(
        self,
        pull_requests: List[PullRequest],
        pull_request_commits: List[PullRequestCommit],
        pull_request_events: List[PullRequestEvent],
    ):
        [session.merge(pull_request) for pull_request in pull_requests]
        [
            session.merge(pull_request_commit)
            for pull_request_commit in pull_request_commits
        ]
        [
            session.merge(pull_request_event)
            for pull_request_event in pull_request_events
        ]
        session.commit()

    @rollback_on_exc
    def save_revert_pr_mappings(
        self, revert_pr_mappings: List[PullRequestRevertPRMapping]
    ):
        [session.merge(revert_pr_map) for revert_pr_map in revert_pr_mappings]
        session.commit()

    @rollback_on_exc
    def get_org_repo_bookmark(self, org_repo: OrgRepo, bookmark_type):
        return (
            session.query(Bookmark)
            .filter(
                and_(
                    Bookmark.repo_id == org_repo.id,
                    Bookmark.type == bookmark_type.value,
                )
            )
            .one_or_none()
        )

    @rollback_on_exc
    def update_org_repo_bookmark(self, bookmark: Bookmark):
        session.merge(bookmark)
        session.commit()

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
    def get_prs_by_ids(self, pr_ids: List[str]):
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

    @rollback_on_exc
    def get_active_team_repos_by_team_id(self, team_id: str) -> List[TeamRepos]:
        return (
            session.query(TeamRepos)
            .filter(TeamRepos.team_id == team_id, TeamRepos.is_active.is_(True))
            .all()
        )

    @rollback_on_exc
    def get_active_team_repos_by_team_ids(self, team_ids: List[str]) -> List[TeamRepos]:
        return (
            session.query(TeamRepos)
            .filter(TeamRepos.team_id.in_(team_ids), TeamRepos.is_active.is_(True))
            .all()
        )

    @rollback_on_exc
    def get_active_org_repos_by_ids(self, repo_ids: List[str]) -> List[OrgRepo]:
        return (
            session.query(OrgRepo)
            .filter(OrgRepo.id.in_(repo_ids), OrgRepo.is_active.is_(True))
            .all()
        )

    @rollback_on_exc
    def get_prs_merged_in_interval(
        self,
        repo_ids: List[str],
        interval: Interval,
        pr_filter: PRFilter = None,
        base_branches: List[str] = None,
    ) -> List[PullRequest]:
        query = session.query(PullRequest).options(defer(PullRequest.data))

        query = self._filter_prs_by_repo_ids(query, repo_ids)
        query = self._filter_prs_merged_in_interval(query, interval)

        query = self._filter_prs(query, pr_filter)
        query = self._filter_base_branch_on_regex(query, base_branches)

        query = query.order_by(PullRequest.state_changed_at.asc())

        return query.all()

    @rollback_on_exc
    def get_pull_request_by_id(self, pr_id: str) -> PullRequest:
        return (
            session.query(PullRequest)
            .options(defer(PullRequest.data))
            .filter(PullRequest.id == pr_id)
            .one_or_none()
        )

    @rollback_on_exc
    def get_previous_pull_request(self, pull_request: PullRequest) -> PullRequest:
        return (
            session.query(PullRequest)
            .options(defer(PullRequest.data))
            .filter(
                PullRequest.repo_id == pull_request.repo_id,
                PullRequest.state_changed_at < pull_request.state_changed_at,
                PullRequest.base_branch == pull_request.base_branch,
                PullRequest.state == PullRequestState.MERGED,
            )
            .order_by(PullRequest.state_changed_at.desc())
            .first()
        )

    def _filter_prs_by_repo_ids(self, query, repo_ids: List[str]):
        return query.filter(PullRequest.repo_id.in_(repo_ids))

    def _filter_prs_merged_in_interval(self, query, interval: Interval):
        return query.filter(
            PullRequest.state_changed_at.between(interval.from_time, interval.to_time),
            PullRequest.state == PullRequestState.MERGED,
        )

    def _filter_prs(self, query, pr_filter: PRFilter):
        if pr_filter:
            query = query.filter(*pr_filter.filter_query)
        return query

    def _filter_base_branch_on_regex(self, query, base_branches: List[str] = None):
        if base_branches:
            conditions = [
                PullRequest.base_branch.op("~")(term) for term in base_branches
            ]
            return query.filter(or_(*conditions))
        return query
