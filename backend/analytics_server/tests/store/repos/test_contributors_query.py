from datetime import datetime

from mhq.store.models.code import PullRequestState
from mhq.store.repos.code import CodeRepoService


class FakeQuery:
    """Records the conditions handed to .filter() and returns no rows.

    The suite has no database, so the only way to assert what
    get_contributors_for_repos actually asks for is to capture the SQLAlchemy
    expressions it builds.
    """

    def __init__(self):
        self.conditions = []

    def query(self, *_args):
        return self

    def filter(self, *conditions):
        self.conditions.extend(conditions)
        return self

    def group_by(self, *_args):
        return self

    def order_by(self, *_args):
        return self

    def all(self):
        return []


class FakeDb:
    def __init__(self, session):
        self.session = session


def capture_contributor_query_conditions():
    fake_query = FakeQuery()
    service = CodeRepoService()
    service._db = FakeDb(fake_query)

    service.get_contributors_for_repos(
        ["35737b5a-7f35-4fbd-b86b-5c6052f4e206"],
        datetime(2024, 1, 1),
        datetime(2024, 2, 1),
    )

    return fake_query.conditions


def test_only_merged_prs_are_counted():
    # The dropdown's counts have to agree with the metrics they filter, and
    # every metric query pairs the window with a merged-state check (see
    # CodeRepoService._filter_prs_merged_in_interval). Without it someone who
    # opened and closed 15 PRs without merging any of them was listed as
    # "15 PRs" and selecting them produced an empty Lead Time card.
    conditions = capture_contributor_query_conditions()

    state_conditions = [
        condition
        for condition in conditions
        if "state" in str(condition) and "state_changed_at" not in str(condition)
    ]

    assert len(state_conditions) == 1
    assert state_conditions[0].right.value == PullRequestState.MERGED
