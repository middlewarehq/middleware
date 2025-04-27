from uuid import uuid4
import re


def uuid4_str():
    return str(uuid4())


def is_bot_name(name: str) -> bool:
    pattern = re.compile(
        r"(?i)(\b[\w@-]*[-_\[\]@ ]+bot[-_\d\[\]]*\b|\[bot\]|_bot_|_bot$|^bot_)"
    )
    return bool(pattern.search(name))
