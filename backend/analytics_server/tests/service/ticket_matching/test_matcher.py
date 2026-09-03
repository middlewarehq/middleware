from mhq.service.ticket_matching.matcher import extract_ticket_keys

# CLUSTOX: Jira integration, Phase 3 (ticket-PR matching). Every example
# here is either a real PR title/branch found in this org's own history
# (see docs/JIRA_INTEGRATION_PROPOSAL.md's status notes) or a real false-
# positive-shaped string chosen to prove the regex alone isn't the
# safety net (the caller cross-checking against real ticket keys is).


def test_finds_a_ticket_key_in_a_conventional_commit_style_title():
    keys = extract_ticket_keys("fix(PZDA-543): record the accepted policy version", "")
    assert keys == ["PZDA-543"]


def test_finds_a_lowercased_ticket_key_in_a_branch_name():
    keys = extract_ticket_keys("", "fix/pzda-543-consent-policy-version")
    assert keys == ["PZDA-543"]


def test_dedupes_the_same_key_appearing_in_both_title_and_branch():
    keys = extract_ticket_keys(
        "fix(PZDA-543): record the accepted policy version",
        "fix/pzda-543-consent-policy-version",
    )
    assert keys == ["PZDA-543"]


def test_expands_a_slash_separated_multi_ticket_reference():
    # Real example: "feat(PZDA-544/546): measure the profile-completion
    # reminder interval in working days"
    keys = extract_ticket_keys("feat(PZDA-544/546): measure the reminder interval", "")
    assert keys == ["PZDA-544", "PZDA-546"]


def test_expands_a_comma_separated_multi_ticket_reference():
    keys = extract_ticket_keys("fix(PZDA-544,546): two tickets, one fix", "")
    assert keys == ["PZDA-544", "PZDA-546"]


def test_finds_a_trailing_parenthetical_reference():
    keys = extract_ticket_keys(
        "fix(guarantees): TopUpCalculator must round half-up (PZDA-877)", ""
    )
    assert keys == ["PZDA-877"]


def test_returns_nothing_for_a_pr_with_no_ticket_reference():
    keys = extract_ticket_keys(
        "ci(frontend): fail the ESLint gate only on findings a change introduced",
        "fix/eslint-gate-new-findings-only",
    )
    assert keys == []


def test_ignores_a_bare_number_with_no_letter_prefix():
    keys = extract_ticket_keys("Bump version to 2024", "")
    assert keys == []


def test_extracts_a_key_shaped_substring_that_is_not_actually_a_ticket():
    # The regex alone can't know "ISO-27001" isn't a Jira key -- that's
    # deliberate (see the module docstring). The caller is responsible
    # for discarding anything that isn't a real, currently-synced ticket
    # key before treating it as a match.
    keys = extract_ticket_keys("chore: note the ISO-27001 audit date", "")
    assert keys == ["ISO-27001"]


def test_handles_none_and_empty_strings_without_raising():
    assert extract_ticket_keys(None, "", None) == []
