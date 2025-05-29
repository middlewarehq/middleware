from dataclasses import dataclass
from datetime import datetime
from typing import Optional

from mhq.store.models.code.enums import PullRequestEventType
from mhq.exapi.models.github import GitHubBaseUser
from mhq.exapi.schemas.timeline import GitHubPullTimelineEvent


@dataclass
class GithubPRTimelineEvent:
    id: str              
    user_login:str           
    type: PullRequestEventType 
    timestamp: datetime  
    raw_data: GitHubPullTimelineEvent     