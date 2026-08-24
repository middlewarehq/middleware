from mhq.utils.string import is_bot_author


def test_bracket_bot_suffix_is_a_bot():
    assert is_bot_author("dependabot[bot]") is True
    assert is_bot_author("renovate[bot]") is True


def test_known_bot_names_are_bots():
    assert is_bot_author("dependabot") is True
    assert is_bot_author("github-actions") is True


def test_a_human_whose_name_contains_bot_is_not_a_bot():
    # Substring matching on "bot" would wrongly exclude these people.
    assert is_bot_author("robotnik") is False
    assert is_bot_author("botond") is False
    assert is_bot_author("abbott") is False


def test_none_and_empty_are_not_bots():
    assert is_bot_author(None) is False
    assert is_bot_author("") is False


def test_matching_is_case_insensitive():
    assert is_bot_author("Dependabot[Bot]") is True
