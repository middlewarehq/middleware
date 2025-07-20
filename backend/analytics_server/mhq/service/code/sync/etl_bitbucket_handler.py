import uuid
from datetime import datetime
from typing import List, Dict, Optional, Tuple, Set

import pytz

from mhq.exapi.models.bitbucket import BitbucketRepo, BitbucketPR, BitbucketCommit, BitbucketReview, BitbucketPRState
from mhq.exapi.bitbucket import BitbucketApiService
from mhq.service.code.sync.etl_code_analytics import CodeETLAnalyticsService
from mhq.service.code.sync.etl_provider_handler import CodeProviderETLHandler
from mhq.service.code.sync.revert_pr_bitbucket_sync import (
    RevertPRsBitbucketSyncHandler,
    get_revert_prs_bitbucket_sync_handler,
)
from mhq.store.models import UserIdentityProvider
from mhq.store.models.code import (
    OrgRepo,
    PullRequestState,
    PullRequest,
    PullRequestCommit,
    PullRequestEvent,
    PullRequestEventType,
    PullRequestEventState,
    PullRequestRevertPRMapping,
    CodeProvider,
)
from mhq.store.repos.code import CodeRepoService
from mhq.store.repos.core import CoreRepoService
from mhq.utils.log import LOG
from mhq.utils.time import time_now, ISO_8601_DATE_FORMAT

PR_PROCESSING_CHUNK_SIZE = 100


class BitbucketETLHandler(CodeProviderETLHandler):
    """Handler for Bitbucket ETL operations."""
    
    def __init__(
        self,
        org_id: str,
        bitbucket_api_service: BitbucketApiService,
        code_repo_service: CodeRepoService,
        code_etl_analytics_service: CodeETLAnalyticsService,
        bitbucket_revert_pr_sync_handler: RevertPRsBitbucketSyncHandler,
    ):
        self.org_id = org_id
        self._api = bitbucket_api_service
        self.code_repo_service = code_repo_service
        self.code_etl_analytics_service : CodeETLAnalyticsService = (
            code_etl_analytics_service
        )
        self.provider = CodeProvider.BITBUCKET.value
        self.bitbucket_revert_pr_sync_handler: RevertPRsBitbucketSyncHandler = (
            bitbucket_revert_pr_sync_handler
        )

    def check_pat_validity(self) -> bool:
        """Check if the Bitbucket Personal Access Token is valid.
        
        Returns:
            bool: True if the PAT is valid.
            
        Raises:
            Exception: If the Bitbucket credentials are invalid.
        """
        is_valid = self._api.check_pat()
        if not is_valid:
            raise Exception("Bitbucket credentials are invalid. Please check username or password.")
        return is_valid
    
    def get_org_repos(self, org_repos: List[OrgRepo]) -> List[OrgRepo]:
        """Get organization repositories from Bitbucket API.
        
        Args:
            org_repos: List of organization repositories to fetch.
            
        Returns:
            List of processed OrgRepo objects.
        """
        bitbucket_repos: List[BitbucketRepo] = []
        for org_repo in org_repos:
            workspace = org_repo.org_name
            repo_slug = org_repo.name
            try:
                bitbucket_repo = self._api.get_workspace_repos(workspace, repo_slug)
                bitbucket_repos.append(bitbucket_repo)
            except Exception as e:
                LOG.error(f"Error getting Bitbucket repository {workspace}/{repo_slug}: {e}")
                continue
        repo_idempotency_key_org_repo_map = {
            org_repo.idempotency_key: org_repo for org_repo in org_repos
        }
        
        processed_repos = []
        for bitbucket_repo in bitbucket_repos:
            org_repo = repo_idempotency_key_org_repo_map.get(str(bitbucket_repo.idempotency_key))
            if org_repo is not None:
                processed_repo = self._process_bitbucket_repo(org_repo, bitbucket_repo)
                if processed_repo is not None:
                    processed_repos.append(processed_repo)
        
        return processed_repos

    def _process_bitbucket_repo(
        self, org_repo: OrgRepo, bitbucket_repo: BitbucketRepo
    ) -> OrgRepo:
        """Process a Bitbucket repository into an OrgRepo object.
        
        Args:
            org_repo: Original organization repository.
            bitbucket_repo: Bitbucket repository data.
            
        Returns:
            Processed OrgRepo object.
        """
        processed_repo = OrgRepo()
        processed_repo.id = org_repo.id
        processed_repo.org_id = self.org_id
        processed_repo.name = bitbucket_repo.name
        processed_repo.provider = self.provider
        processed_repo.org_name = bitbucket_repo.org_name
        processed_repo.default_branch = bitbucket_repo.default_branch
        processed_repo.language = bitbucket_repo.languages
        processed_repo.contributors = self._api.get_repo_contributors(
            bitbucket_repo.org_name, bitbucket_repo.name
        )
        processed_repo.idempotency_key = str(bitbucket_repo.idempotency_key)
        processed_repo.slug = bitbucket_repo.name
        processed_repo.updated_at = time_now()
        return processed_repo

    def get_repo_pull_requests_data(
        self, org_repo: OrgRepo, bookmark: datetime
    ) -> Tuple[List[PullRequest], List[PullRequestCommit], List[PullRequestEvent]]:
        """Get all pull requests, their commits and events for a repository.
        
        Args:
            org_repo: OrgRepo object to get pull requests for
            bookmark: Bookmark date to get all pull requests after this date
            
        Returns:
            Tuple of pull requests, their commits and events
        """
        workspace = org_repo.org_name
        repo_slug = org_repo.name
        
        try:
            bitbucket_prs: List[BitbucketPR] = self._api.get_pull_requests(
                workspace, repo_slug, state="all"
            )
        except Exception as e:
            LOG.error(f"Error getting pull requests for {workspace}/{repo_slug}: {e}")
            return [], [], []

        prs_to_process = []
        for pr in bitbucket_prs:
            if pr.updated_at.replace(tzinfo=pytz.UTC) <= bookmark:
                continue
                
            state_changed_at = pr.merged_at if pr.merged_at else pr.closed_at
            if (
                pr.state != BitbucketPRState.OPEN.value
                and state_changed_at
                and state_changed_at.replace(tzinfo=pytz.UTC) < bookmark
            ):
                continue
                
            prs_to_process.append(pr)

        if not prs_to_process:
            LOG.info("Nothing to process 🎉")
            return [], [], []

        pull_requests: List[PullRequest] = []
        pr_commits: List[PullRequestCommit] = []
        pr_events: List[PullRequestEvent] = []
        prs_added: Set[int] = set()

        for bitbucket_pr in prs_to_process:
            if bitbucket_pr.number in prs_added:
                continue

            pr_model, event_models, pr_commit_models = self.process_pr(
                str(org_repo.id), bitbucket_pr, workspace, repo_slug
            )
            pull_requests.append(pr_model)
            pr_events += event_models
            pr_commits += pr_commit_models
            prs_added.add(bitbucket_pr.number)

        return pull_requests, pr_commits, pr_events

    def process_pr(
        self, repo_id: str, pr: BitbucketPR, workspace: str, repo_slug: str
    ) -> Tuple[PullRequest, List[PullRequestEvent], List[PullRequestCommit]]:
        """Process a single pull request and return its model with events and commits.
        
        Args:
            repo_id: Repository ID
            pr: BitbucketPR object
            workspace: Bitbucket workspace name
            repo_slug: Repository slug
            
        Returns:
            Tuple of PR model, events, and commits
        """
        existing_pr_model: Optional[PullRequest] = self.code_repo_service.get_repo_pr_by_number(
            repo_id, pr.number
        )
        pr_event_model_list: List[PullRequestEvent] = (
            self.code_repo_service.get_pr_events(existing_pr_model) if existing_pr_model else []
        )

        try:
            reviews: List[BitbucketReview] = self._api.get_pr_reviews(
                workspace, repo_slug, pr.number
            )
            diff_stats = self._api.get_pr_diff_stats(workspace, repo_slug, pr.number)
        except Exception as e:
            LOG.error(f"Error getting PR details for {workspace}/{repo_slug}/pull/{pr.number}: {e}")
            reviews = []
            diff_stats = {"additions": 0, "deletions": 0, "changed_files": 0}

        pr_model: PullRequest = self._to_pr_model(
            pr, existing_pr_model, repo_id, len(reviews), diff_stats
        )
        pr_events_model_list: List[PullRequestEvent] = self._to_pr_events(
            reviews, pr_model, pr_event_model_list
        )
        
        pr_commits_model_list: List[PullRequestCommit] = []
        # Get commits for all PRs, not just merged ones, to calculate proper analytics
        try:
            commits: List[BitbucketCommit] = self._api.get_pr_commits(
                workspace, repo_slug, pr.number
            )
            pr_commits_model_list = self._to_pr_commits(commits, pr_model)
            
            # Update the commit count in PR meta
            if pr_model.meta and "code_stats" in pr_model.meta:
                pr_model.meta["code_stats"]["commits"] = len(pr_commits_model_list)
                
        except Exception as e:
            LOG.error(f"Error getting commits for PR {pr.number}: {e}")
            # Set commit count to 0 if we can't get commits
            if pr_model.meta and "code_stats" in pr_model.meta:
                pr_model.meta["code_stats"]["commits"] = 0

        pr_model = self.code_etl_analytics_service.create_pr_metrics(
            pr_model, pr_events_model_list, pr_commits_model_list
        )

        return pr_model, pr_events_model_list, pr_commits_model_list

    def get_revert_prs_mapping(
        self, prs: List[PullRequest]
    ) -> List[PullRequestRevertPRMapping]:
        """Get revert PR mappings for the given PRs.
        
        Args:
            prs: List of PullRequest objects
            
        Returns:
            List of PullRequestRevertPRMapping objects
        """
        return self.bitbucket_revert_pr_sync_handler(prs)

    def _to_pr_model(
        self,
        pr: BitbucketPR,
        pr_model: Optional[PullRequest],
        repo_id: str,
        review_comments: int = 0,
        diff_stats: Optional[Dict[str, int]] = None,
    ) -> PullRequest:
        """Convert BitbucketPR to PullRequest model.
        
        Args:
            pr: BitbucketPR object
            pr_model: Existing PullRequest model if any
            repo_id: Repository ID
            review_comments: Number of review comments
            diff_stats: Diff statistics dict
            
        Returns:
            PullRequest model
        """
        if diff_stats is None:
            diff_stats = {"additions": 0, "deletions": 0, "changed_files": 0}
            
        state = self._get_state(pr)
        pr_id = pr_model.id if pr_model else uuid.uuid4()
        state_changed_at = None
        
        if state != PullRequestState.OPEN:
            state_changed_at = (
                pr.merged_at.replace(tzinfo=pytz.UTC)
                if pr.merged_at
                else pr.closed_at.replace(tzinfo=pytz.UTC) if pr.closed_at
                else None
            )

        merge_commit_sha: Optional[str] = self._get_merge_commit_sha(pr.data, state)

        pr_model = PullRequest()
        pr_model.id = pr_id
        pr_model.number = str(pr.number)
        pr_model.title = pr.title
        pr_model.url = pr.url
        pr_model.created_at = pr.created_at.replace(tzinfo=pytz.UTC)
        pr_model.updated_at = pr.updated_at.replace(tzinfo=pytz.UTC)
        pr_model.state_changed_at = state_changed_at
        pr_model.state = state
        pr_model.base_branch = pr.base_branch
        pr_model.head_branch = pr.head_branch
        pr_model.author = pr.author
        pr_model.repo_id = repo_id
        pr_model.data = pr.data
        pr_model.requested_reviews = pr.reviewers
        pr_model.meta = dict(
            code_stats=dict(
                commits=0,  # This will be updated when we get actual commit count
                additions=diff_stats.get("additions", 0),
                deletions=diff_stats.get("deletions", 0),
                changed_files=diff_stats.get("changed_files", 0),
                comments=review_comments,
            ),
            user_profile=dict(username=pr.author),
        )
        pr_model.provider = UserIdentityProvider.BITBUCKET.value
        pr_model.merge_commit_sha = merge_commit_sha

        return pr_model

    @staticmethod
    def _get_merge_commit_sha(raw_data: Dict, state: PullRequestState) -> Optional[str]:
        """Extract merge commit SHA from raw data.
        
        Args:
            raw_data: Raw PR data from Bitbucket
            state: PR state
            
        Returns:
            Merge commit SHA if available
        """
        if state != PullRequestState.MERGED:
            return None

        merge_commit = raw_data.get("merge_commit")
        if merge_commit:
            return merge_commit.get("hash")
        
        return None

    @staticmethod
    def _get_state(pr: BitbucketPR) -> PullRequestState:
        """Convert Bitbucket PR state to internal PR state.
        
        Args:
            pr: BitbucketPR object
            
        Returns:
            PullRequestState enum value
        """
        if pr.state == BitbucketPRState.MERGED:
            return PullRequestState.MERGED
        elif pr.state in [BitbucketPRState.DECLINED, BitbucketPRState.SUPERSEDED]:
            return PullRequestState.CLOSED
        else:
            return PullRequestState.OPEN

    @staticmethod
    def _map_bitbucket_review_state_to_pr_event_state(review_state: str) -> str:
        """Map Bitbucket review state to internal PullRequestEventState.
        
        Args:
            review_state: Bitbucket review state
            
        Returns:
            Internal PullRequestEventState value
        """
        from mhq.exapi.models.bitbucket import BitbucketReviewState
        
        if review_state == BitbucketReviewState.APPROVED.value:
            return PullRequestEventState.APPROVED.value
        elif review_state == BitbucketReviewState.CHANGES_REQUESTED.value:
            return PullRequestEventState.CHANGES_REQUESTED.value
        else:
            return PullRequestEventState.COMMENTED.value

    @staticmethod
    def _to_pr_events(
        reviews: List[BitbucketReview],
        pr_model: PullRequest,
        pr_events_model: List[PullRequestEvent],
    ) -> List[PullRequestEvent]:
        """Convert Bitbucket reviews to PullRequestEvent models.
        
        Args:
            reviews: List of BitbucketReview objects
            pr_model: PullRequest model
            pr_events_model: Existing PR events
            
        Returns:
            List of PullRequestEvent models
        """
        pr_events: List[PullRequestEvent] = []
        pr_event_id_map = {event.idempotency_key: event.id for event in pr_events_model}

        for review in reviews:
            if not review.created_at:
                continue

            review_data = review.data.copy()
            review_data["state"] = BitbucketETLHandler._map_bitbucket_review_state_to_pr_event_state(
                review.state.value
            )

            pr_event = PullRequestEvent()
            pr_event.id = pr_event_id_map.get(review.idempotency_key, uuid.uuid4())
            pr_event.pull_request_id = str(pr_model.id)
            pr_event.type = PullRequestEventType.REVIEW.value
            pr_event.data = review_data
            pr_event.created_at = review.created_at.replace(tzinfo=pytz.UTC)
            pr_event.idempotency_key = review.idempotency_key
            pr_event.org_repo_id = pr_model.repo_id
            pr_event.actor_username = review.actor_username
            pr_events.append(pr_event)
        return pr_events

    def _to_pr_commits(
        self,
        commits: List[BitbucketCommit],
        pr_model: PullRequest,
    ) -> List[PullRequestCommit]:
        """Convert Bitbucket commits to PullRequestCommit models.
        
        Args:
            commits: List of BitbucketCommit objects
            pr_model: PullRequest model
            
        Returns:
            List of PullRequestCommit models
        """
        pr_commits: List[PullRequestCommit] = []

        for commit in commits:
            pr_commit = PullRequestCommit()
            pr_commit.hash = commit.hash
            pr_commit.pull_request_id = str(pr_model.id)
            pr_commit.url = commit.url
            pr_commit.data = commit.data
            pr_commit.message = commit.message
            pr_commit.author = commit.author_email
            pr_commit.created_at = commit.created_at.replace(tzinfo=pytz.UTC)
            pr_commit.org_repo_id = pr_model.repo_id
            pr_commits.append(pr_commit)
        return pr_commits


def _get_access_token(org_id: str) -> Optional[str]:
    """Retrieve access token for the given organization."""
    core_repo_service = CoreRepoService()
    access_token = core_repo_service.get_access_token(
        org_id, UserIdentityProvider.BITBUCKET
    )
    
    if not access_token:
        LOG.error(
            f"Access token not found for org {org_id} and provider "
            f"{UserIdentityProvider.BITBUCKET.value}"
        )
    
    return access_token


def get_bitbucket_etl_handler(org_id: str) -> BitbucketETLHandler:
    """Factory function to create a BitbucketETLHandler instance."""
    access_token = _get_access_token(org_id)
    
    if not access_token:
        raise Exception(f"Access token not found for org {org_id} and provider {UserIdentityProvider.BITBUCKET.value}")
    
    return BitbucketETLHandler(
        org_id=org_id,
        bitbucket_api_service=BitbucketApiService(access_token),
        code_repo_service=CodeRepoService(),
        code_etl_analytics_service=CodeETLAnalyticsService(),
        bitbucket_revert_pr_sync_handler=get_revert_prs_bitbucket_sync_handler(),
    )