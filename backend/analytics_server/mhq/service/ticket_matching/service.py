from mhq.service.ticket_matching.matcher import extract_ticket_keys
from mhq.store.models.ticket_matching import PullRequestTicketMapping
from mhq.store.repos.ticket_matching import TicketMatchingRepoService
from mhq.utils.log import LOG


class TicketMatchingService:
    """
    Step 4 of docs/JIRA_INTEGRATION_PROPOSAL.md -- links a PR to the
    ticket(s) its title/branch name reference. Provider-agnostic on
    purpose: this only reads already-synced PullRequest/Ticket rows, so
    it doesn't need an ETL-handler-per-provider the way the Jira/GitHub/
    GitLab syncs do -- there's no external API variability to abstract
    over here, just internal data already in our own DB.
    """

    def __init__(self, repo_service: TicketMatchingRepoService):
        self._repo = repo_service

    def match_org_prs_to_tickets(self, org_id: str) -> None:
        # One batch lookup for every ticket in the org, and one batch
        # fetch for every PR that doesn't have a mapping yet -- matching
        # itself is then pure in-memory work (regex + dict lookups), not
        # a query per PR.
        ticket_id_by_key = self._repo.get_org_tickets_key_map(org_id)
        if not ticket_id_by_key:
            LOG.info(f"No tickets synced yet for org {org_id}, skipping PR matching")
            return

        unmatched_prs = self._repo.get_unmatched_prs_for_org(org_id)
        if not unmatched_prs:
            return

        mappings = [
            PullRequestTicketMapping(pr_id=pr.id, ticket_id=ticket_id_by_key[key])
            for pr in unmatched_prs
            for key in extract_ticket_keys(pr.title, pr.head_branch)
            if key in ticket_id_by_key
        ]
        if not mappings:
            return

        self._repo.save_mappings(mappings)
        LOG.info(f"Matched {len(mappings)} PR-ticket link(s) for org {org_id}")


def get_ticket_matching_service() -> TicketMatchingService:
    return TicketMatchingService(TicketMatchingRepoService())


def match_tickets_to_prs(org_id: str) -> None:
    get_ticket_matching_service().match_org_prs_to_tickets(org_id)
