import re


def _parse_gitlab_diff(text):
    line_range_match = re.search(
        r"^@@ -(\d+),(\d+) \+(\d+),(\d+) @@$", text, flags=re.MULTILINE
    )
    if line_range_match:
        deletion_lines = int(line_range_match.group(2))
        addition_lines = int(line_range_match.group(4))
    else:
        deletion_lines = 0
        addition_lines = 0
    return addition_lines, deletion_lines


def parse_gitlab_diffs(texts):
    additions = 0
    deletions = 0
    for text in texts:
        diff_additions, diff_deletions = _parse_gitlab_diff(text[:50])
        additions += diff_additions
        deletions += diff_deletions
    return additions, deletions, len(texts)
