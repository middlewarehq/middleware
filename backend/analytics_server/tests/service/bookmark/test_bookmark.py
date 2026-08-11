from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

from mhq.service.bookmark.bookmark import BookmarkService
from mhq.service.bookmark.bookmark_types import BookmarkType
from mhq.store.models.projects import ProjectIssuesBookmark

# CLUSTOX: Jira integration, Phase 2 (issue sync). This repo has no
# existing test coverage for BookmarkService at all -- scoped to just the
# PROJECT_ISSUES_BOOKMARK path added for Jira issue sync, not a full
# backfill of the pre-existing (also untested) bookmark types. See
# docs/JIRA_INTEGRATION_PROPOSAL.md.

ORG_PROJECT_ID = "proj-1"
PROVIDER = "jira"


def _service(project_repo_service=None) -> BookmarkService:
    return BookmarkService(
        code_repo_service=MagicMock(),
        workflow_repo_service=MagicMock(),
        incident_repo_service=MagicMock(),
        project_repo_service=project_repo_service or MagicMock(),
    )


class TestGetBookmark:
    def test_defaults_to_default_sync_days_ago_when_no_bookmark_row_exists(self):
        repo = MagicMock()
        repo.get_project_issues_bookmark.return_value = None

        bookmark = _service(repo).get_bookmark(
            ORG_PROJECT_ID, BookmarkType.PROJECT_ISSUES_BOOKMARK, PROVIDER
        )

        expected = datetime.now(timezone.utc) - timedelta(
            days=BookmarkService.DEFAULT_SYNC_DAYS
        )
        assert abs((expected - bookmark).total_seconds()) < 5

    def test_uses_a_custom_default_sync_days_when_given(self):
        repo = MagicMock()
        repo.get_project_issues_bookmark.return_value = None

        bookmark = _service(repo).get_bookmark(
            ORG_PROJECT_ID,
            BookmarkType.PROJECT_ISSUES_BOOKMARK,
            PROVIDER,
            default_sync_days=90,
        )

        expected = datetime.now(timezone.utc) - timedelta(days=90)
        assert abs((expected - bookmark).total_seconds()) < 5

    def test_returns_the_stored_bookmark_when_one_exists(self):
        stored = datetime(2024, 6, 1, tzinfo=timezone.utc)
        repo = MagicMock()
        repo.get_project_issues_bookmark.return_value = ProjectIssuesBookmark(
            org_project_id=ORG_PROJECT_ID,
            provider=PROVIDER,
            bookmark=stored.isoformat(),
        )

        bookmark = _service(repo).get_bookmark(
            ORG_PROJECT_ID, BookmarkType.PROJECT_ISSUES_BOOKMARK, PROVIDER
        )

        assert bookmark == stored


class TestUpdateBookmark:
    def test_persists_the_new_timestamp_for_the_right_project_and_provider(self):
        repo = MagicMock()
        repo.get_project_issues_bookmark.return_value = None
        new_bookmark = datetime(2024, 7, 1, tzinfo=timezone.utc)

        _service(repo).update_bookmark(
            ORG_PROJECT_ID,
            BookmarkType.PROJECT_ISSUES_BOOKMARK,
            PROVIDER,
            new_bookmark,
        )

        repo.update_project_issues_bookmark.assert_called_once()
        saved = repo.update_project_issues_bookmark.call_args[0][0]
        assert str(saved.org_project_id) == ORG_PROJECT_ID
        assert saved.provider == PROVIDER
        assert saved.bookmark == new_bookmark.isoformat()


class TestResetOrgBookmarks:
    def test_resets_every_project_issues_bookmark_for_the_org(self):
        existing = ProjectIssuesBookmark(
            org_project_id=ORG_PROJECT_ID, provider=PROVIDER, bookmark="old"
        )
        repo = MagicMock()
        repo.get_all_org_project_issues_bookmarks.return_value = [existing]
        reset_to = datetime(2024, 1, 1, tzinfo=timezone.utc)

        _service(repo).reset_org_bookmarks("org-1", reset_to)

        assert existing.bookmark == reset_to.isoformat()
        repo.update_project_issues_bookmarks.assert_called_once_with([existing])
