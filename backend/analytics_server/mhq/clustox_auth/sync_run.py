"""
CLUSTOX: per-workspace sync outcomes.

Upstream syncs a single organisation and reports success regardless of what
happened inside it. With one sync per workspace that is untenable: a failing
workspace would be invisible among the ones that worked.

Every workspace sync records a row here, so "did last night's sync work?" is a
query rather than an exercise in reading log files before they rotate.
"""

from datetime import datetime
from typing import List, Optional

from sqlalchemy import Column, DateTime, String, Text, func
from sqlalchemy.dialects.postgresql import UUID

from mhq.store import db, rollback_on_exc
from mhq.utils.time import time_now


class SyncRunStatus:
    RUNNING = "RUNNING"
    SUCCESS = "SUCCESS"
    FAILED = "FAILED"
    SKIPPED = "SKIPPED"


class ClustoxSyncRun(db.Model):
    __tablename__ = "ClustoxSyncRun"

    id = Column(UUID(as_uuid=True), primary_key=True)
    org_id = Column(UUID(as_uuid=True), nullable=False)
    started_at = Column(DateTime(timezone=True), server_default=func.now())
    finished_at = Column(DateTime(timezone=True))
    status = Column(String, nullable=False)
    detail = Column(Text)


class SyncRunService:
    def __init__(self):
        self._db = db

    @rollback_on_exc
    def start(self, org_id: str) -> ClustoxSyncRun:
        from mhq.utils.string import uuid4_str

        run = ClustoxSyncRun(
            id=uuid4_str(),
            org_id=org_id,
            started_at=time_now(),
            status=SyncRunStatus.RUNNING,
        )
        self._db.session.add(run)
        self._db.session.commit()
        return run

    @rollback_on_exc
    def finish(
        self, run: ClustoxSyncRun, status: str, detail: Optional[str] = None
    ) -> None:
        run.status = status
        run.finished_at = time_now()
        # Truncated: a stack trace helps, an unbounded one bloats the row.
        run.detail = detail[:2000] if detail else None
        self._db.session.commit()

    @rollback_on_exc
    def latest_per_org(self) -> List[ClustoxSyncRun]:
        """Most recent run for each workspace."""
        subq = (
            self._db.session.query(
                ClustoxSyncRun.org_id,
                func.max(ClustoxSyncRun.started_at).label("latest"),
            )
            .group_by(ClustoxSyncRun.org_id)
            .subquery()
        )
        return (
            self._db.session.query(ClustoxSyncRun)
            .join(
                subq,
                (ClustoxSyncRun.org_id == subq.c.org_id)
                & (ClustoxSyncRun.started_at == subq.c.latest),
            )
            .all()
        )

    @rollback_on_exc
    def latest_for_org(self, org_id: str) -> Optional[ClustoxSyncRun]:
        return (
            self._db.session.query(ClustoxSyncRun)
            .filter(ClustoxSyncRun.org_id == org_id)
            .order_by(ClustoxSyncRun.started_at.desc())
            .first()
        )


def get_sync_run_service() -> SyncRunService:
    return SyncRunService()


def as_dict(run: ClustoxSyncRun) -> dict:
    def iso(value: Optional[datetime]) -> Optional[str]:
        return value.isoformat() if value else None

    return {
        "org_id": str(run.org_id),
        "started_at": iso(run.started_at),
        "finished_at": iso(run.finished_at),
        "status": run.status,
        "detail": run.detail,
    }
