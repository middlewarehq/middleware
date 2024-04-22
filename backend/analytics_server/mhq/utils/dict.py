from typing import Dict, Any, List


def get_average_of_dict_values(key_to_int_map: Dict[any, int]) -> int:
    """
    This method accepts a dictionary with any key type mapped to integer values and returns the average of those keys. Nulls are considered as zero.
    """

    if not key_to_int_map:
        return 0

    values = list(key_to_int_map.values())
    sum_of_value = 0
    for value in values:

        if value is None:
            continue

        sum_of_value += value

    return sum_of_value // len(values)


def get_key_to_count_map_from_key_to_list_map(
    week_to_list_map: Dict[Any, List[Any]]
) -> Dict[Any, int]:
    """
    This method takes a dict of keys to list and returns a dict of keys mapped to the length of lists from the input dict.
    """
    list_len_or_zero = lambda x: len(x) if type(x) in [list, set] else 0

    return {key: list_len_or_zero(lst) for key, lst in week_to_list_map.items()}
