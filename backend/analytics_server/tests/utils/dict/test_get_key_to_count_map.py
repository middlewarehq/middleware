from dora.utils.dict import get_key_to_count_map_from_key_to_list_map


def test_empty_dict_return_empty_dict():
    assert get_key_to_count_map_from_key_to_list_map({}) == {}


def test_dict_with_list_values():
    assert get_key_to_count_map_from_key_to_list_map(
        {"a": [1, 2], "b": ["a", "p", "9"]}
    ) == {"a": 2, "b": 3}


def test_dict_with_set_values():
    assert get_key_to_count_map_from_key_to_list_map(
        {"a": {1, 2}, "b": {"a", "p", "9"}}
    ) == {"a": 2, "b": 3}


def test_dict_with_non_set_or_list_values():
    assert get_key_to_count_map_from_key_to_list_map(
        {"a": None, "b": 0, "c": "Ckk"}
    ) == {"a": 0, "b": 0, "c": 0}


def test_dict_with_mixed_values():
    assert get_key_to_count_map_from_key_to_list_map(
        {"a": None, "b": 0, "c": "Ckk", "e": [1], "g": {"A", "B"}}
    ) == {"a": 0, "b": 0, "c": 0, "e": 1, "g": 2}
