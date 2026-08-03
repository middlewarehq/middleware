from datetime import datetime
import uuid
import pytz
from unittest.mock import Mock

from mhq.service.code.sync.etl_bitbucket_handler import BitbucketETLHandler
from mhq.exapi.models.bitbucket import BitbucketPR, BitbucketPRState
from mhq.store.models.code import PullRequestState
from mhq.store.models import UserIdentityProvider
from mhq.utils.string import uuid4_str

ORG_ID = uuid4_str()


def test__to_pr_model_given_a_bitbucket_pr_returns_new_pr_model():
    """Test that BitbucketPR is correctly converted to PullRequest model."""
    repo_id = uuid4_str()
    number = 123
    author = "test_user"
    merged_at = datetime(2022, 6, 29, 10, 53, 15, tzinfo=pytz.UTC)
    head_branch = "feature"
    base_branch = "main"
    title = "Test PR"
    review_comments = 2
    
    # Create a mock Bitbucket PR data structure
    pr_data = {
        "id": number,
        "title": title,
        "links": {"html": {"href": f"https://bitbucket.org/workspace/repo/pull-requests/{number}"}},
        "author": {"display_name": author},
        "reviewers": [{"display_name": "reviewer1"}],
        "state": "MERGED",
        "destination": {"branch": {"name": base_branch}},
        "source": {"branch": {"name": head_branch}},
        "created_on": "2022-06-29T10:53:15+00:00",
        "updated_on": "2022-06-29T11:53:15+00:00",
        "merge_commit": {"hash": "abcd1234"}
    }
    
    bitbucket_pr = BitbucketPR(pr_data)
    
    # Mock diff stats
    diff_stats = {
        "additions": 10,
        "deletions": 5,
        "changed_files": 2
    }
    
    bitbucket_etl_handler = BitbucketETLHandler(
        ORG_ID, 
        Mock(),  # bitbucket_api_service
        Mock(),  # code_repo_service  
        Mock(),  # code_etl_analytics_service
        Mock()   # bitbucket_revert_pr_sync_handler
    )
    pr_model = bitbucket_etl_handler._to_pr_model(
        pr=bitbucket_pr,
        pr_model=None,
        repo_id=repo_id,
        review_comments=review_comments,
        diff_stats=diff_stats,
    )
    
    # Assertions
    assert pr_model.number == str(number)
    assert pr_model.title == title
    assert pr_model.author == author
    assert pr_model.state == PullRequestState.MERGED
    assert pr_model.base_branch == base_branch
    assert pr_model.head_branch == head_branch
    assert pr_model.repo_id == repo_id
    assert pr_model.provider == UserIdentityProvider.BITBUCKET.value
    assert pr_model.merge_commit_sha == "abcd1234"
    assert pr_model.meta["code_stats"]["additions"] == 10
    assert pr_model.meta["code_stats"]["deletions"] == 5
    assert pr_model.meta["code_stats"]["changed_files"] == 2
    assert pr_model.meta["code_stats"]["comments"] == review_comments


def test__get_state_converts_bitbucket_state_to_internal_state():
    """Test that Bitbucket PR states are correctly mapped to internal states."""
    bitbucket_etl_handler = BitbucketETLHandler(
        ORG_ID, 
        Mock(),  # bitbucket_api_service
        Mock(),  # code_repo_service  
        Mock(),  # code_etl_analytics_service
        Mock()   # bitbucket_revert_pr_sync_handler
    )
    
    # Test MERGED state
    pr_data_merged = {"id": 1, "state": "MERGED"}
    pr_merged = BitbucketPR(pr_data_merged)
    assert bitbucket_etl_handler._get_state(pr_merged) == PullRequestState.MERGED
    
    # Test DECLINED state
    pr_data_declined = {"id": 2, "state": "DECLINED"}
    pr_declined = BitbucketPR(pr_data_declined)
    assert bitbucket_etl_handler._get_state(pr_declined) == PullRequestState.CLOSED
    
    # Test SUPERSEDED state
    pr_data_superseded = {"id": 3, "state": "SUPERSEDED"}
    pr_superseded = BitbucketPR(pr_data_superseded)
    assert bitbucket_etl_handler._get_state(pr_superseded) == PullRequestState.CLOSED
    
    # Test OPEN state
    pr_data_open = {"id": 4, "state": "OPEN"}
    pr_open = BitbucketPR(pr_data_open)
    assert bitbucket_etl_handler._get_state(pr_open) == PullRequestState.OPEN


def test__get_merge_commit_sha_returns_correct_sha():
    """Test that merge commit SHA is correctly extracted."""
    bitbucket_etl_handler = BitbucketETLHandler(
        ORG_ID, 
        Mock(),  # bitbucket_api_service
        Mock(),  # code_repo_service  
        Mock(),  # code_etl_analytics_service
        Mock()   # bitbucket_revert_pr_sync_handler
    )
    
    # Test with merge commit present
    raw_data_with_merge = {"merge_commit": {"hash": "abcd1234"}}
    sha = bitbucket_etl_handler._get_merge_commit_sha(raw_data_with_merge, PullRequestState.MERGED)
    assert sha == "abcd1234"
    
    # Test with no merge commit (non-merged PR)
    raw_data_no_merge = {}
    sha = bitbucket_etl_handler._get_merge_commit_sha(raw_data_no_merge, PullRequestState.OPEN)
    assert sha is None
    
    # Test with non-merged state
    raw_data_closed = {"merge_commit": {"hash": "abcd1234"}}
    sha = bitbucket_etl_handler._get_merge_commit_sha(raw_data_closed, PullRequestState.CLOSED)
    assert sha is None
