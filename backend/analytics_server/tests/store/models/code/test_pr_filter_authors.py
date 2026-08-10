from mhq.store.models.code.filter import PRFilter


def test_setting_authors_no_longer_raises():
    # Before this change the conditions dict had no "authors" key, so the
    # filter_query comprehension raised KeyError as soon as the field was set.
    conditions = PRFilter(authors=["hamad-clustox"]).filter_query
    assert len(conditions) == 1


def test_authors_produces_an_author_condition():
    conditions = PRFilter(authors=["hamad-clustox"]).filter_query
    # Compiling to string is the cheapest way to assert the column and operator
    # without a database.
    rendered = str(conditions[0])
    assert "author" in rendered
    assert "IN" in rendered.upper()


def test_no_authors_produces_no_author_condition():
    conditions = PRFilter(base_branches=["^main$"]).filter_query
    assert all("author" not in str(c) for c in conditions)


def test_empty_author_list_is_ignored():
    # An empty list means "no filter selected", not "match nothing".
    conditions = PRFilter(authors=[]).filter_query
    assert conditions == []


def test_existing_filters_are_unaffected():
    # Regression guard: the dashboards everyone already uses must not change.
    conditions = PRFilter(base_branches=["^main$"], excluded_pr_ids=["a"]).filter_query
    assert len(conditions) == 2
