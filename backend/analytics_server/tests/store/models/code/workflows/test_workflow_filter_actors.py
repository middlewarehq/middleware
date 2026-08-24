from mhq.service.workflows.workflow_filter import ParseWorkflowFilterProcessor
from mhq.store.models.code.workflows.filter import WorkflowFilter


def test_event_actors_produces_an_actor_condition():
    conditions = WorkflowFilter(event_actors=["hamad-clustox"]).filter_query
    assert len(conditions) == 1
    rendered = str(conditions[0])
    assert "event_actor" in rendered
    assert "IN" in rendered.upper()


def test_no_event_actors_produces_no_actor_condition():
    conditions = WorkflowFilter(head_branches=["^main$"]).filter_query
    assert all("event_actor" not in str(c) for c in conditions)


def test_empty_actor_list_is_ignored():
    assert WorkflowFilter(event_actors=[]).filter_query == []


def test_existing_workflow_filters_are_unaffected():
    # Regression guard for the deployment frequency everyone already sees.
    conditions = WorkflowFilter(head_branches=["^main$"]).filter_query
    assert len(conditions) == 1


def test_parser_reads_event_actors_from_the_request():
    parsed = ParseWorkflowFilterProcessor().apply({"event_actors": ["hamad-clustox"]})
    assert parsed.event_actors == ["hamad-clustox"]


def test_parser_defaults_event_actors_to_none():
    parsed = ParseWorkflowFilterProcessor().apply({})
    assert parsed.event_actors is None
