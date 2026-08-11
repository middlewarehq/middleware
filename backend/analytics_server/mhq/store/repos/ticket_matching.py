from typing import Dict, List

from sqlalchemy.orm import defer

from mhq.store import db, rollback_on_exc
from mhq.store.models.code import OrgRepo, PullRequest
from mhq.store.models.projects import OrgProject, Ticket
from mhq.store.models.ticket_matching import PullRequestTicketMapping


class TicketMatchingRepoService:
    def __init__(self):
        self._db = db

    @rollback_on_exc
    def get_org_tickets_key_map(self, org_id: str) -> Dict[str, str]:
        """
        Uppercased ticket key -> ticket id, for every ticket ever synced
        for this org (not scoped to a project's is_active -- a ticket
        that was already synced should stay matchable even if its
        project is later deselected). One query, used as an in-memory
        lookup instead of a query per PR.
        """
        tickets = (
            self._db.session.query(Ticket.id, Ticket.key)
            .join(OrgProject, Ticket.org_project_id == OrgProject.id)
            .filter(OrgProject.org_id == org_id)
            .all()
        )
        return {key.upper(): str(ticket_id) for ticket_id, key in tickets}

    @rollback_on_exc
    def get_unmatched_prs_for_org(self, org_id: str) -> List[PullRequest]:
        """
        PRs for this org with no PullRequestTicketMapping row yet. Not
        "not yet closed" or "recently updated" -- a PR that genuinely
        references no ticket gets re-scanned every cycle (cheap: no API
        calls, just a regex against two already-fetched strings), but a
        PR whose match was already found never gets re-queried.
        """
        return (
            self._db.session.query(PullRequest)
            .options(defer(PullRequest.data))
            .join(OrgRepo, PullRequest.repo_id == OrgRepo.id)
            .outerjoin(
                PullRequestTicketMapping,
                PullRequestTicketMapping.pr_id == PullRequest.id,
            )
            .filter(
                OrgRepo.org_id == org_id,
                PullRequestTicketMapping.pr_id.is_(None),
            )
            .all()
        )

    @rollback_on_exc
    def save_mappings(self, mappings: List[PullRequestTicketMapping]):
        [self._db.session.merge(mapping) for mapping in mappings]
        self._db.session.commit()
