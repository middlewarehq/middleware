from datetime import datetime
from typing import List, Tuple

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
    def update_repo_workflow_runs_bookmark(self, bookmark: RepoWorkflowRunsBookmark):
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
    ):
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
