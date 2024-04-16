import uuid
from datetime import datetime
from typing import Tuple

import pytz
from sqlalchemy import String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY, ENUM

from dora.store import db
from dora.store.models.code.enums import (
    CodeProvider,
    BookmarkType,
    TeamReposDeploymentType,
)


class OrgRepo(db.Model):
    __tablename__ = "OrgRepo"

    id = db.Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = db.Column(UUID(as_uuid=True), ForeignKey("Organization.id"))
    name = db.Column(String)
    provider = db.Column(String)
    org_name = db.Column(String)
    default_branch = db.Column(String)
    language = db.Column(String)
    contributors = db.Column(JSONB)
    idempotency_key = db.Column(String)
    slug = db.Column(String)
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    is_active = db.Column(Boolean, default=True)

    @property
    def url(self):
        if self.provider == CodeProvider.GITHUB.value:
            return f"https://www.github.com/{self.org_name}/{self.name}"

        raise NotImplementedError(f"URL not implemented for {self.provider}")

    @property
    def contributor_count(self) -> [Tuple[str, int]]:
        if not self.contributors:
            return []

        return self.contributors.get("contributions", [])

    def __hash__(self):
        return hash(self.id)


class TeamRepos(db.Model):
    __tablename__ = "TeamRepos"

    team_id = db.Column(UUID(as_uuid=True), ForeignKey("Team.id"), primary_key=True)
    org_repo_id = db.Column(
        UUID(as_uuid=True), ForeignKey("OrgRepo.id"), primary_key=True
    )
    prod_branch = db.Column(String)
    prod_branches = db.Column(ARRAY(String))
    deployment_type = db.Column(
        ENUM(TeamReposDeploymentType), default=TeamReposDeploymentType.PR_MERGE
    )
    is_active = db.Column(Boolean, default=True)
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class RepoSyncLogs(db.Model):
    __tablename__ = "RepoSyncLogs"

    repo_id = db.Column(UUID(as_uuid=True), ForeignKey("OrgRepo.id"), primary_key=True)
    synced_at = db.Column(DateTime(timezone=True), server_default=func.now())


class Bookmark(db.Model):
    __tablename__ = "Bookmark"

    repo_id = db.Column(UUID(as_uuid=True), primary_key=True)
    type = db.Column(ENUM(BookmarkType), primary_key=True)
    bookmark = db.Column(String)
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class BookmarkMergeToDeployBroker(db.Model):
    __tablename__ = "BookmarkMergeToDeployBroker"

    repo_id = db.Column(UUID(as_uuid=True), primary_key=True)
    bookmark = db.Column(String)
    created_at = db.Column(DateTime(timezone=True), server_default=func.now())
    updated_at = db.Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    @property
    def bookmark_date(self):
        if not self.bookmark:
            return None
        return datetime.fromisoformat(self.bookmark).astimezone(tz=pytz.UTC)
