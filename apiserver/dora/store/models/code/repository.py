import uuid
from datetime import datetime
from typing import Tuple

import pytz
from sqlalchemy import Column, String, Boolean, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB, ARRAY, ENUM

from dora.store import Base
from dora.store.models.code.enums import (
    CodeProvider,
    BookmarkType,
    TeamReposDeploymentType,
)


class OrgRepo(Base):
    __tablename__ = "OrgRepo"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    org_id = Column(UUID(as_uuid=True), ForeignKey("Organization.id"))
    name = Column(String)
    provider = Column(String)
    org_name = Column(String)
    default_branch = Column(String)
    language = Column(String)
    contributors = Column(JSONB)
    idempotency_key = Column(String)
    slug = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    is_active = Column(Boolean, default=True)

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


class TeamRepos(Base):
    __tablename__ = "TeamRepos"

    team_id = Column(UUID(as_uuid=True), ForeignKey("Team.id"), primary_key=True)
    org_repo_id = Column(UUID(as_uuid=True), ForeignKey("OrgRepo.id"), primary_key=True)
    prod_branch = Column(String)
    prod_branches = Column(ARRAY(String))
    deployment_type = Column(
        ENUM(TeamReposDeploymentType), default=TeamReposDeploymentType.PR_MERGE
    )
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class RepoSyncLogs(Base):
    __tablename__ = "RepoSyncLogs"

    repo_id = Column(UUID(as_uuid=True), ForeignKey("OrgRepo.id"), primary_key=True)
    synced_at = Column(DateTime(timezone=True), server_default=func.now())


class Bookmark(Base):
    __tablename__ = "Bookmark"

    repo_id = Column(UUID(as_uuid=True), primary_key=True)
    type = Column(ENUM(BookmarkType), primary_key=True)
    bookmark = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class BookmarkMergeToDeployBroker(Base):
    __tablename__ = "BookmarkMergeToDeployBroker"

    repo_id = Column(UUID(as_uuid=True), primary_key=True)
    bookmark = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    @property
    def bookmark_date(self):
        if not self.bookmark:
            return None
        return datetime.fromisoformat(self.bookmark).astimezone(tz=pytz.UTC)
