import re
from typing import List

# Jira's own key format: 2-10 letters, a dash, a number (e.g. PZDA-543).
# Case-insensitive since branch names conventionally lowercase it
# (fix/pzda-543-...) while titles keep it uppercase.
#
# The trailing (?:[/,]\d+)* handles a real pattern found in this org's
# own PR history -- a title referencing "PZDA-544/546" to mean two
# tickets sharing one prefix, not one ticket numbered "544/546".
_TICKET_KEY_PATTERN = re.compile(r"\b([A-Za-z]{2,10})-(\d+(?:[/,]\d+)*)\b")


def extract_ticket_keys(*texts: str) -> List[str]:
    """
    Every ticket-key-shaped token across the given strings, uppercased
    and de-duplicated (order-preserving) -- a PR referencing the same
    key in both its title and branch name should only match once, and
    "PZDA-544/546" expands to ["PZDA-544", "PZDA-546"].

    This is a heuristic, not a guarantee: something shaped like a ticket
    key (e.g. "ISO-27001" in an unrelated branch name) would be extracted
    too. The caller is expected to only keep matches against ticket keys
    that actually exist in the org's synced tickets -- that check, not
    this regex, is what keeps a coincidental key-shaped substring from
    becoming a false match.
    """
    seen = set()
    keys: List[str] = []

    for text in texts:
        if not text:
            continue

        for match in _TICKET_KEY_PATTERN.finditer(text):
            prefix = match.group(1).upper()
            for number in match.group(2).split("/"):
                for sub_number in number.split(","):
                    key = f"{prefix}-{sub_number}"
                    if key not in seen:
                        seen.add(key)
                        keys.append(key)

    return keys
