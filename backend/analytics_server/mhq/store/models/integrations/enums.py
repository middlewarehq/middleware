from enum import Enum


class UserIdentityProvider(Enum):
    GITHUB = "github"
    GITLAB = "gitlab"
    # CLUSTOX: Jenkins credentials live in Integration like any other provider.
    JENKINS = "jenkins"
    # CLUSTOX: Jira is a project-tracker integration, not a code provider --
    # added here (Phase 1: link + store the token) so CoreRepoService's
    # generic get_access_token(org_id, provider) can resolve a Jira token
    # the same way it already does for GITHUB/GITLAB. Sync/fetch logic is a
    # separate, later phase (see docs/JIRA_INTEGRATION_PROPOSAL.md) -- this
    # value on its own does not add Jira to any code-sync path.
    JIRA = "jira"

    @classmethod
    def get_enum(self, provider: str):
        for v in self.__members__.values():
            if provider == v.value:
                return v
        return None
