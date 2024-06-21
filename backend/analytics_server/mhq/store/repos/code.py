from datetime import datetime
from operator import and_
from typing import Optional, List

from sqlalchemy import or_
from sqlalchemy.orm import defer
from mhq.store.models.core import Team

from mhq.store import db, rollback_on_exc
from mhq.store.models.code import (
    PullRequest,
    PullRequestEvent,
    OrgRepo,
    PullRequestRevertPRMapping,
    PullRequestCommit,
    Bookmark,
    TeamRepos,
    PullRequestState,
    PRFilter,
    BookmarkMergeToDeployBroker,
)
from mhq.utils.time import Interval


class CodeRepoService:
    def __init__(self):
        self._db = db

    @rollback_on_exc
    def get_active_org_repos(self, org_id: str) -> List[OrgRepo]:
        return (
            self._db.session.query(OrgRepo)
            .filter(OrgRepo.org_id == org_id, OrgRepo.is_active.is_(True))
            .all()
        )

    @rollback_on_exc
    def update_org_repos(self, org_repos: List[OrgRepo]):
        [self._db.session.merge(org_repo) for org_repo in org_repos]
        self._db.session.commit()
        return self.get_repos_by_ids([str(repo.id) for repo in org_repos])

    @rollback_on_exc
    def update_team_repos(self, team: Team, org_repos: List[OrgRepo]):

        existing_team_repos = self._db.session.query(TeamRepos).filter(
            TeamRepos.team_id == team.id
        )

        for team_repo in existing_team_repos:
            team_repo.is_active = False

        repo_id_to_team_repos_map = {
            str(team_repo.org_repo_id): team_repo for team_repo in existing_team_repos
        }

        updated_team_repos = []
        for repo in org_repos:
            team_repo = repo_id_to_team_repos_map.get(str(repo.id))
            if team_repo:
                team_repo.is_active = True
            else:
                team_repo = TeamRepos(
                    team_id=team.id,
                    org_repo_id=str(repo.id),
                    prod_branches=(
                        ["^" + repo.default_branch + "$"]
                        if repo.default_branch
                        else None
                    ),
                )

            updated_team_repos.append(team_repo)

        for team_repo in updated_team_repos:
            self._db.session.merge(team_repo)

        self._db.session.commit()

    @rollback_on_exc
    def patch_team_repos_mapping(
        self, team: Team, team_repos: List[TeamRepos]
    ) -> List[TeamRepos]:
        [self._db.session.merge(team_repo) for team_repo in team_repos]
        self._db.session.commit()
        team_repo_ids = [str(team_repo.org_repo_id) for team_repo in team_repos]
        return self._db.session.query(TeamRepos).filter(
            TeamRepos.team_id == team.id, TeamRepos.org_repo_id.in_(team_repo_ids)
        )

    @rollback_on_exc
    def get_org_repos_used_across_teams(self, org_id: str) -> List[OrgRepo]:
        """
        Returns a list of all active org repos which are also used in teams.
        """

        return (
            self._db.session.query(OrgRepo)
            .join(TeamRepos, TeamRepos.org_repo_id == OrgRepo.id)
            .join(Team, TeamRepos.team_id == Team.id)
            .filter(
                OrgRepo.org_id == org_id,
                OrgRepo.is_active.is_(True),
                TeamRepos.is_active.is_(True),
                Team.is_deleted.is_(False),
            )
            .all()
        )

    @rollback_on_exc
    def save_pull_requests_data(
        self,
        pull_requests: List[PullRequest],
        pull_request_commits: List[PullRequestCommit],
        pull_request_events: List[PullRequestEvent],
    ):
        [self._db.session.merge(pull_request) for pull_request in pull_requests]
        [
            self._db.session.merge(pull_request_commit)
            for pull_request_commit in pull_request_commits
        ]
        [
            self._db.session.merge(pull_request_event)
            for pull_request_event in pull_request_events
        ]
        self._db.session.commit()

    @rollback_on_exc
    def update_prs(self, prs: List[PullRequest]):
        [self._db.session.merge(pr) for pr in prs]
        self._db.session.commit()

    @rollback_on_exc
    def save_revert_pr_mappings(
        self, revert_pr_mappings: List[PullRequestRevertPRMapping]
    ):
        [self._db.session.merge(revert_pr_map) for revert_pr_map in revert_pr_mappings]
        self._db.session.commit()

    @rollback_on_exc
    def get_org_repo_bookmark(self, org_repo: OrgRepo, bookmark_type):
        return (
            self._db.session.query(Bookmark)
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
        self._db.session.merge(bookmark)
        self._db.session.commit()

    @rollback_on_exc
    def get_repo_by_id(self, repo_id: str) -> Optional[OrgRepo]:
        return (
            self._db.session.query(OrgRepo).filter(OrgRepo.id == repo_id).one_or_none()
        )

    @rollback_on_exc
    def get_repo_pr_by_number(self, repo_id: str, pr_number) -> Optional[PullRequest]:
        return (
            self._db.session.query(PullRequest)
            .options(defer(PullRequest.data))
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
            self._db.session.query(PullRequestEvent)
            .options(defer(PullRequestEvent.data))
            .filter(PullRequestEvent.pull_request_id == pr_model.id)
            .all()
        )
        return pr_events

    @rollback_on_exc
    def get_prs_by_ids(self, pr_ids: List[str]):
        query = (
            self._db.session.query(PullRequest)
            .options(defer(PullRequest.data))
            .filter(PullRequest.id.in_(pr_ids))
        )
        return query.all()

    @rollback_on_exc
    def get_prs_by_head_branch_match_strings(
        self, repo_ids: List[str], match_strings: List[str]
    ) -> List[PullRequest]:
        query = (
            self._db.session.query(PullRequest)
            .options(defer(PullRequest.data))
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
            self._db.session.query(PullRequest)
            .options(defer(PullRequest.data))
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
    def get_active_team_repos_by_team_id(self, team_id: str) -> List[TeamRepos]:
        return (
            self._db.session.query(TeamRepos)
            .filter(TeamRepos.team_id == team_id, TeamRepos.is_active.is_(True))
            .all()
        )

    @rollback_on_exc
    def get_active_team_repos_by_team_ids(self, team_ids: List[str]) -> List[TeamRepos]:
        return (
            self._db.session.query(TeamRepos)
            .filter(TeamRepos.team_id.in_(team_ids), TeamRepos.is_active.is_(True))
            .all()
        )

    @rollback_on_exc
    def get_active_org_repos_by_ids(self, repo_ids: List[str]) -> List[OrgRepo]:
        return (
            self._db.session.query(OrgRepo)
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
        has_non_null_mtd=False,
    ) -> List[PullRequest]:
        query = self._db.session.query(PullRequest).options(defer(PullRequest.data))

        query = self._filter_prs_by_repo_ids(query, repo_ids)
        query = self._filter_prs_merged_in_interval(query, interval)

        query = self._filter_prs(query, pr_filter)
        query = self._filter_base_branch_on_regex(query, base_branches)

        if has_non_null_mtd:
            query = query.filter(PullRequest.merge_to_deploy.is_not(None))

        query = query.order_by(PullRequest.state_changed_at.asc())

        return query.all()

    @rollback_on_exc
    def get_pull_request_by_id(self, pr_id: str) -> PullRequest:
        return (
            self._db.session.query(PullRequest)
            .options(defer(PullRequest.data))
            .filter(PullRequest.id == pr_id)
            .one_or_none()
        )

    @rollback_on_exc
    def get_previous_pull_request(self, pull_request: PullRequest) -> PullRequest:
        return (
            self._db.session.query(PullRequest)
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

    @rollback_on_exc
    def get_repos_by_ids(self, ids: List[str]) -> List[OrgRepo]:
        if not ids:
            return []

        return self._db.session.query(OrgRepo).filter(OrgRepo.id.in_(ids)).all()

    @rollback_on_exc
    def get_repos_by_idempotency_keys(
        self, idempotency_keys: List[str]
    ) -> List[OrgRepo]:

        return (
            self._db.session.query(OrgRepo)
            .filter(OrgRepo.idempotency_key.in_(idempotency_keys))
            .all()
        )

    @rollback_on_exc
    def get_team_repos(self, team_id) -> List[OrgRepo]:
        team_repos = (
            self._db.session.query(TeamRepos)
            .filter(and_(TeamRepos.team_id == team_id, TeamRepos.is_active == True))
            .all()
        )
        if not team_repos:
            return []

        team_repo_ids = [tr.org_repo_id for tr in team_repos]
        return self.get_repos_by_ids(team_repo_ids)

    @rollback_on_exc
    def get_team_repos_by_team_id(self, team_id: str) -> List[TeamRepos]:
        team_repos = (
            self._db.session.query(TeamRepos)
            .filter(and_(TeamRepos.team_id == team_id, TeamRepos.is_active == True))
            .all()
        )
        if not team_repos:
            return []

        return team_repos

    @rollback_on_exc
    def get_merge_to_deploy_broker_bookmark(
        self, repo_id: str
    ) -> BookmarkMergeToDeployBroker:
        return (
            self._db.session.query(BookmarkMergeToDeployBroker)
            .filter(BookmarkMergeToDeployBroker.repo_id == repo_id)
            .one_or_none()
        )

    @rollback_on_exc
    def update_merge_to_deploy_broker_bookmark(
        self, bookmark: BookmarkMergeToDeployBroker
    ):
        self._db.session.merge(bookmark)
        self._db.session.commit()

    @rollback_on_exc
    def get_prs_in_repo_merged_before_given_date_with_merge_to_deploy_as_null(
        self, repo_id: str, to_time: datetime
    ):
        return (
            self._db.session.query(PullRequest)
            .options(defer(PullRequest.data))
            .filter(
                PullRequest.repo_id == repo_id,
                PullRequest.state == PullRequestState.MERGED,
                PullRequest.state_changed_at <= to_time,
                PullRequest.merge_to_deploy.is_(None),
            )
            .all()
        )

    @rollback_on_exc
    def get_repo_revert_prs_mappings_updated_in_interval(
        self, repo_id, from_time, to_time
    ) -> List[PullRequestRevertPRMapping]:
        query = (
            self._db.session.query(PullRequestRevertPRMapping)
            .join(PullRequest, PullRequest.id == PullRequestRevertPRMapping.pr_id)
            .filter(
                PullRequest.repo_id == repo_id,
                PullRequest.state == PullRequestState.MERGED,
                PullRequestRevertPRMapping.updated_at.between(from_time, to_time),
            )
        )
        query = query.order_by(PullRequest.updated_at.desc())

        return query.all()

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
