from mhq.utils.dict import get_average_of_dict_values


def test_empty_dict_returns_zero():
    assert get_average_of_dict_values({}) == 0


def test_nulls_counted_as_zero():
    assert get_average_of_dict_values({"w1": 2, "w2": 4, "w3": None}) == 2


def test_average_of_integers_with_integer_avg():
    assert get_average_of_dict_values({"w1": 2, "w2": 4, "w3": 6}) == 4


def test_average_of_integers_with_decimal_avg_rounded_off():
    assert get_average_of_dict_values({"w1": 2, "w2": 4, "w3": 7}) == 4
