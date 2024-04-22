import re
from typing import List
from werkzeug.exceptions import BadRequest


def check_regex(pattern: str):
    # pattern is a string containing the regex pattern
    try:
        re.compile(pattern)

    except re.error:
        return False

    return True


def check_all_regex(patterns: List[str]) -> bool:
    # patterns is a list of strings containing the regex patterns
    for pattern in patterns:
        if not pattern or not check_regex(pattern):
            return False

    return True


def regex_list(patterns: List[str]) -> List[str]:
    if not check_all_regex(patterns):
        raise BadRequest("Invalid regex pattern")
    return patterns
