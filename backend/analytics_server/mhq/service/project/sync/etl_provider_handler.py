from abc import ABC, abstractmethod
from datetime import datetime
from typing import List, Tuple

from mhq.store.models.projects import OrgProject, Sprint, Ticket, TicketState


class ProjectProviderETLHandler(ABC):
    """
    Mirrors CodeProviderETLHandler -- one implementation per
    project-tracking tool (Jira, to start). See
    docs/JIRA_INTEGRATION_PROPOSAL.md.
    """

    @abstractmethod
    def check_pat_validity(self) -> bool:
        """
        :return: whether the stored credentials are still valid.
        """

    @abstractmethod
    def get_project_issues_data(
        self, org_project: OrgProject, bookmark: datetime
    ) -> Tuple[List[Ticket], List[TicketState]]:
        """
        Tickets updated after `bookmark`, and their status-transition
        history, for the given project.
        :param org_project: the OrgProject to sync issues for.
        :param bookmark: only issues updated at or after this time.
        :return: Tickets and TicketStates, ready to persist -- ids are
        already reconciled against any existing rows (same idempotency_key
        reuses the same id) by the implementation, not by the caller.
        """

    @abstractmethod
    def get_project_sprints_data(self, org_project: OrgProject) -> List[Sprint]:
        """
        Every sprint (any state -- future/active/closed) for the Scrum
        board(s) backing this project, planned/completed issue counts
        already computed -- ready to persist. Re-fetched and upserted in
        full every cycle, no bookmark (see Sprint's own docstring for
        why). A project with no Scrum board (Kanban-only) returns an
        empty list, not an error.
        """
