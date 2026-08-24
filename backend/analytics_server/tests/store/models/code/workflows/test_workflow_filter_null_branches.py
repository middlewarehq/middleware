"""
A repo with no prod_branches configured must not silently hide every
deployment.

TeamRepos.prod_branches is nullable. The BFF flattens it into the workflow
filter's head_branches, so a null arrives here as [None]. `head_branch ~ NULL`
is NULL in Postgres -- never true -- so an unguarded filter dropped every row
and the dashboard reported "No Deployments" with no error anywhere.

Observed live: a repo with 14 synced Jenkins runs returned 13 deployments when
queried without a filter and 0 through the dashboard.
"""

from mhq.store.models.code.workflows.filter import WorkflowFilter


def test_a_single_none_branch_produces_no_condition():
    # The live failure: prod_branches was null, so head_branches was [None].
    assert WorkflowFilter(head_branches=[None]).filter_query == []


def test_none_entries_are_dropped_but_real_ones_survive():
    conditions = WorkflowFilter(head_branches=[None, "^main$"]).filter_query

    assert len(conditions) == 1
    assert "head_branch" in str(conditions[0])


def test_all_none_entries_produce_no_condition():
    assert WorkflowFilter(head_branches=[None, None]).filter_query == []


def test_a_real_branch_still_filters():
    # Regression guard: the common case must be unchanged.
    conditions = WorkflowFilter(head_branches=["^main$"]).filter_query

    assert len(conditions) == 1
    assert "head_branch" in str(conditions[0])


def test_empty_list_is_still_ignored():
    assert WorkflowFilter(head_branches=[]).filter_query == []
