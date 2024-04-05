from dora.store import rollback_on_exc, session
from dora.store.models.code import PullRequest

from sqlalchemy.orm import defer

from typing import List


class CodeRepoService:
    @rollback_on_exc
    def get_prs_by_ids(self, pr_ids: List[str]) -> List[PullRequest]:
        return (
            session.query(PullRequest)
            .options(defer(PullRequest.data))
            .filter(PullRequest.id.in_(pr_ids))
            .all()
        )
