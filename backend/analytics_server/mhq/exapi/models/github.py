from dataclasses import dataclass


@dataclass
class GitHubBaseUser:
    login: str = ""
    id: int = 0
    node_id: str = ""
    avatar_url: str = ""
    gravatar_id: str = ""
    url: str = ""
    html_url: str = ""
    followers_url: str = ""
    following_url: str = ""
    gists_url: str = ""
    starred_url: str = ""
    subscriptions_url: str = ""
    organizations_url: str = ""
    repos_url: str = ""
    events_url: str = ""
    received_events_url: str = ""
    type: str = "User"
    site_admin: bool = False
    contributions: int = 0

    def __hash__(self):
        return hash(self.id)

    def __eq__(self, other):
        if isinstance(other, GitHubBaseUser):
            return self.id == other.id
        return False


@dataclass
class GitHubContributor(GitHubBaseUser):
    contributions: int = 0

    def __hash__(self):
        return hash(self.id)

    def __eq__(self, other):
        if isinstance(other, GitHubContributor):
            return self.id == other.id
        return False
