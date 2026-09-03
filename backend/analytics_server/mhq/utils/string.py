from uuid import uuid4
import re
from typing import Optional


def uuid4_str():
    return str(uuid4())


def is_bot_name(name: str) -> bool:
    pattern = re.compile(
        r"(?i)(\b[\w@-]*[-_\[\]@ ]+bot[-_\d\[\]]*\b|\[bot\]|_bot_|_bot$|^bot_)"
    )
    return bool(pattern.search(name))


# CLUSTOX: bot accounts author real pull requests, so they appear in the
# contributor list unless excluded. Matching is on the exact "[bot]" suffix
# plus an explicit list -- a substring match on "bot" would exclude real
# people called robotnik or abbott.
KNOWN_BOT_AUTHORS = frozenset(
    {
        "dependabot",
        "renovate",
        "github-actions",
        "snyk-bot",
        "greenkeeper",
        "codecov",
        "imgbot",
    }
)


def is_bot_author(username: Optional[str]) -> bool:
    if not username:
        return False

    lowered = username.lower()
    return lowered.endswith("[bot]") or lowered in KNOWN_BOT_AUTHORS
