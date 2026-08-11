from datetime import datetime
from typing import List, Optional, Tuple

from sqlalchemy.orm import defer
from sqlalchemy import and_

from mhq.store import db, rollback_on_exc
from mhq.store.models.code.workflows.enums import (
    RepoWorkflowRunsStatus,
    RepoWorkflowType,
    RepoWorkflowProviders,
)
from mhq.store.models.code.workflows.filter import WorkflowFilter
from mhq.store.models.code.workflows.workflows import (
    RepoWorkflow,
    RepoWorkflowRuns,
    RepoWorkflowRunsBookmark,
)

# CLUSTOX: TeamRepos is written here so the deployment_type switch shares a
# commit with the Jenkins mapping -- see create_jenkins_repo_workflow.
from mhq.store.models.code.repository import OrgRepo, TeamRepos
from mhq.utils.time import Interval


class WorkflowRepoService:
    def __init__(self):
        self._db = db

    @rollback_on_exc
    def get_active_repo_workflows_by_repo_ids_and_providers(
        self, repo_ids: List[str], providers: List[RepoWorkflowProviders]
    ) -> List[RepoWorkflow]:

        return (
            self._db.session.query(RepoWorkflow)
            .options(defer(RepoWorkflow.meta))
            .filter(
                RepoWorkflow.org_repo_id.in_(repo_ids),
                RepoWorkflow.provider.in_(providers),
                RepoWorkflow.is_active.is_(True),
            )
            .all()
        )

    @rollback_on_exc
    def get_repo_workflow_run_by_provider_workflow_run_id(
        self, repo_workflow_id: str, provider_workflow_run_id: str
    ) -> RepoWorkflowRuns:
        return (
            self._db.session.query(RepoWorkflowRuns)
            .filter(
                RepoWorkflowRuns.repo_workflow_id == repo_workflow_id,
                RepoWorkflowRuns.provider_workflow_run_id == provider_workflow_run_id,
            )
            .one_or_none()
        )

    @rollback_on_exc
    def save_repo_workflow_runs(self, repo_workflow_runs: List[RepoWorkflowRuns]):
        [
            self._db.session.merge(repo_workflow_run)
            for repo_workflow_run in repo_workflow_runs
        ]
        self._db.session.commit()

    @rollback_on_exc
    def get_repo_workflow_runs_bookmark(
        self, repo_workflow_id: str
    ) -> RepoWorkflowRunsBookmark:
        return (
            self._db.session.query(RepoWorkflowRunsBookmark)
            .filter(RepoWorkflowRunsBookmark.repo_workflow_id == repo_workflow_id)
            .one_or_none()
        )

    @rollback_on_exc
    def get_all_repo_workflow_runs_bookmark(
        self, org_id: str
    ) -> List[RepoWorkflowRunsBookmark]:
        return (
            self._db.session.query(RepoWorkflowRunsBookmark)
            .join(
                RepoWorkflow,
                RepoWorkflowRunsBookmark.repo_workflow_id == RepoWorkflow.id,
            )
            .join(OrgRepo, RepoWorkflow.org_repo_id == OrgRepo.id)
            .filter(OrgRepo.org_id == org_id)
            .all()
        )

    @rollback_on_exc
    def update_repo_workflow_runs_bookmark(self, bookmark: RepoWorkflowRunsBookmark):
        self._db.session.merge(bookmark)
        self._db.session.commit()

    @rollback_on_exc
    def update_repo_workflow_runs_bookmarks(
        self, bookmarks: List[RepoWorkflowRunsBookmark]
    ):

        for bookmark in bookmarks:
            self._db.session.merge(bookmark)

        self._db.session.commit()

    @rollback_on_exc
    def get_repo_workflow_by_repo_ids(
        self, repo_ids: List[str], type: RepoWorkflowType
    ) -> List[RepoWorkflow]:
        return (
            self._db.session.query(RepoWorkflow)
            .options(defer(RepoWorkflow.meta))
            .filter(
                and_(
                    RepoWorkflow.org_repo_id.in_(repo_ids),
                    RepoWorkflow.type == type,
                    RepoWorkflow.is_active.is_(True),
                )
            )
            .all()
        )

    # CLUSTOX: used by the Jenkins mapping routes to resolve a workflow by id.
    # Deliberately not filtered by provider -- callers that are provider
    # specific must check RepoWorkflow.provider themselves. meta is loaded
    # rather than deferred: unmapping reads the displaced-workflow record out
    # of it, and a deferred load would just cost a second round trip.
    @rollback_on_exc
    def get_repo_workflow_by_id(self, repo_workflow_id: str) -> Optional[RepoWorkflow]:
        return (
            self._db.session.query(RepoWorkflow)
            .filter(RepoWorkflow.id == repo_workflow_id)
            .one_or_none()
        )

    # CLUSTOX: resolves the row that occupies the uniquely indexed
    # (org_repo_id, provider_workflow_id) pair, active or not. Mapping a job
    # that was previously mapped and then unmapped has to reuse this row;
    # inserting a second one violates
    # repoworkflow_orgrepoid_provider_workflow_id. meta is loaded rather than
    # deferred: mapping rewrites the displaced-workflow record it holds.
    #
    # Not filtered by provider, because the index is not either. Filtering by
    # provider made the lookup narrower than the constraint it exists to avoid
    # tripping: a Jenkins job whose full name matched an existing non-Jenkins
    # provider_workflow_id came back as "no row here", and the insert then hit
    # the index and 500'd. Unlikely -- GitHub Actions ids are numeric -- but
    # the caller can only handle a collision it is told about. Callers that
    # care about the provider must check RepoWorkflow.provider themselves;
    # returning a foreign row is the point.
    @rollback_on_exc
    def get_repo_workflow_by_repo_id_and_provider_workflow_id(
        self,
        repo_id: str,
        provider_workflow_id: str,
    ) -> Optional[RepoWorkflow]:
        return (
            self._db.session.query(RepoWorkflow)
            .filter(
                RepoWorkflow.org_repo_id == repo_id,
                RepoWorkflow.provider_workflow_id == provider_workflow_id,
            )
            .one_or_none()
        )

    # CLUSTOX: unlike get_repo_workflow_by_repo_ids this returns inactive rows
    # too, because the inactive ones are exactly what a Jenkins mapping turned
    # off and an unmapping has to turn back on.
    @rollback_on_exc
    def get_repo_workflows_by_repo_id_and_provider(
        self,
        repo_id: str,
        provider: RepoWorkflowProviders,
        type: RepoWorkflowType,
    ) -> List[RepoWorkflow]:
        return (
            self._db.session.query(RepoWorkflow)
            .options(defer(RepoWorkflow.meta))
            .filter(
                RepoWorkflow.org_repo_id == repo_id,
                RepoWorkflow.provider == provider,
                RepoWorkflow.type == type,
            )
            .all()
        )

    # CLUSTOX: writes the Jenkins mapping, the deactivation of the repo's other
    # deployment workflows and the TeamRepos.deployment_type switch in a single
    # commit. If any part applied on its own, a repo could be left with two
    # active deployment sources -- silently double-counting deployments, see
    # deactivate_deployment_workflows_for_repo in mhq/api/integrations.py -- or
    # switched to WORKFLOW with no workflow behind it, which reads as zero
    # deployments.
    #
    # TeamRepos is written from here rather than through CodeRepoService because
    # both services share one db.session and only one of them can own the
    # commit; splitting the write across two commits is the partial-failure this
    # method exists to prevent.
    @rollback_on_exc
    def create_jenkins_repo_workflow(
        self,
        jenkins_workflow: RepoWorkflow,
        workflows_to_deactivate: List[RepoWorkflow],
        team_repos_to_update: List[TeamRepos] = None,
    ) -> RepoWorkflow:
        # add() on an instance already loaded in this session is a no-op, so
        # this covers both a brand new mapping and the reactivation of a row
        # that a previous unmapping left inactive.
        self._db.session.add(jenkins_workflow)
        for workflow in workflows_to_deactivate:
            self._db.session.merge(workflow)
        for team_repo in team_repos_to_update or []:
            self._db.session.merge(team_repo)
        self._db.session.commit()
        return jenkins_workflow

    # CLUSTOX: removing a Jenkins mapping, restoring the GitHub Actions rows it
    # displaced and restoring the TeamRepos.deployment_type values it overwrote
    # happen in one commit. Half of this applied on its own would leave the repo
    # with no active deployment source at all, and its Deployment Frequency at
    # zero.
    @rollback_on_exc
    def deactivate_repo_workflow(
        self,
        repo_workflow: RepoWorkflow,
        workflows_to_reactivate: List[RepoWorkflow] = None,
        team_repos_to_update: List[TeamRepos] = None,
    ) -> RepoWorkflow:
        repo_workflow.is_active = False
        self._db.session.merge(repo_workflow)
        for workflow in workflows_to_reactivate or []:
            self._db.session.merge(workflow)
        for team_repo in team_repos_to_update or []:
            self._db.session.merge(team_repo)
        self._db.session.commit()
        return repo_workflow

    @rollback_on_exc
    def get_repo_workflows_by_repo_id(self, repo_id: str) -> List[RepoWorkflow]:
        return (
            self._db.session.query(RepoWorkflow)
            .options(defer(RepoWorkflow.meta))
            .filter(
                RepoWorkflow.org_repo_id == repo_id,
                RepoWorkflow.is_active.is_(True),
            )
            .all()
        )

    @rollback_on_exc
    def get_successful_repo_workflows_runs_by_repo_ids(
        self, repo_ids: List[str], interval: Interval, workflow_filter: WorkflowFilter
    ) -> List[Tuple[RepoWorkflow, RepoWorkflowRuns]]:
        query = (
            self._db.session.query(RepoWorkflow, RepoWorkflowRuns)
            .options(defer(RepoWorkflow.meta), defer(RepoWorkflowRuns.meta))
            .join(
                RepoWorkflowRuns, RepoWorkflow.id == RepoWorkflowRuns.repo_workflow_id
            )
        )
        query = self._filter_active_repo_workflows(query)
        query = self._filter_repo_workflows_by_repo_ids(query, repo_ids)
        query = self._filter_repo_workflow_runs_in_interval(query, interval)
        query = self._filter_repo_workflow_runs_status(
            query, RepoWorkflowRunsStatus.SUCCESS
        )

        query = self._filter_workflows(query, workflow_filter)

        query = query.order_by(RepoWorkflowRuns.conducted_at.asc())

        return query.all()

    @rollback_on_exc
    def get_repos_workflow_runs_by_repo_ids(
        self,
        repo_ids: List[str],
        interval: Interval,
        workflow_filter: WorkflowFilter = None,
    ) -> List[Tuple[RepoWorkflow, RepoWorkflowRuns]]:
        query = (
            self._db.session.query(RepoWorkflow, RepoWorkflowRuns)
            .options(defer(RepoWorkflow.meta), defer(RepoWorkflowRuns.meta))
            .join(
                RepoWorkflowRuns, RepoWorkflow.id == RepoWorkflowRuns.repo_workflow_id
            )
        )
        query = self._filter_active_repo_workflows(query)
        query = self._filter_active_repo_workflows(query)
        query = self._filter_repo_workflows_by_repo_ids(query, repo_ids)
        query = self._filter_repo_workflow_runs_in_interval(query, interval)

        query = self._filter_workflows(query, workflow_filter)

        query = query.order_by(RepoWorkflowRuns.conducted_at.asc())

        return query.all()

    @rollback_on_exc
    def get_repo_workflow_run_by_id(
        self, repo_workflow_run_id: str
    ) -> Tuple[RepoWorkflow, RepoWorkflowRuns]:
        return (
            self._db.session.query(RepoWorkflow, RepoWorkflowRuns)
            .options(defer(RepoWorkflow.meta), defer(RepoWorkflowRuns.meta))
            .join(RepoWorkflow, RepoWorkflow.id == RepoWorkflowRuns.repo_workflow_id)
            .filter(RepoWorkflowRuns.id == repo_workflow_run_id)
            .one_or_none()
        )

    @rollback_on_exc
    def get_previous_workflow_run(
        self, workflow_run: RepoWorkflowRuns
    ) -> Tuple[RepoWorkflow, RepoWorkflowRuns]:
        return (
            self._db.session.query(RepoWorkflow, RepoWorkflowRuns)
            .options(defer(RepoWorkflow.meta), defer(RepoWorkflowRuns.meta))
            .join(RepoWorkflow, RepoWorkflow.id == RepoWorkflowRuns.repo_workflow_id)
            .filter(
                RepoWorkflowRuns.repo_workflow_id == workflow_run.repo_workflow_id,
                RepoWorkflowRuns.conducted_at < workflow_run.conducted_at,
                RepoWorkflowRuns.head_branch == workflow_run.head_branch,
            )
            .order_by(RepoWorkflowRuns.conducted_at.desc())
            .first()
        )

    @rollback_on_exc
    def get_repo_workflow_runs_conducted_after_time(
        self, repo_id: str, from_time: datetime = None, limit_value: int = 500
    ) -> List[RepoWorkflowRuns]:
        query = (
            self._db.session.query(RepoWorkflowRuns)
            .options(defer(RepoWorkflowRuns.meta))
            .join(RepoWorkflow, RepoWorkflow.id == RepoWorkflowRuns.repo_workflow_id)
            .filter(
                RepoWorkflow.org_repo_id == repo_id,
                RepoWorkflow.is_active.is_(True),
                RepoWorkflowRuns.status == RepoWorkflowRunsStatus.SUCCESS,
            )
        )

        if from_time:
            query = query.filter(RepoWorkflowRuns.conducted_at >= from_time)

        query = query.order_by(RepoWorkflowRuns.conducted_at)

        return query.limit(limit_value).all()

    def _filter_active_repo_workflows(self, query):
        return query.filter(
            RepoWorkflow.is_active.is_(True),
        )

    def _filter_repo_workflows_by_repo_ids(self, query, repo_ids: List[str]):
        return query.filter(RepoWorkflow.org_repo_id.in_(repo_ids))

    def _filter_repo_workflow_runs_in_interval(self, query, interval: Interval):
        return query.filter(
            RepoWorkflowRuns.conducted_at.between(interval.from_time, interval.to_time)
        )

    def _filter_repo_workflow_runs_status(self, query, status: RepoWorkflowRunsStatus):
        return query.filter(RepoWorkflowRuns.status == status)

    def _filter_workflows(self, query, workflow_filter: WorkflowFilter):
        if not workflow_filter:
            return query
        query = query.filter(*workflow_filter.filter_query)
        return query
