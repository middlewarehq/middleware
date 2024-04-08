from dataclasses import dataclass


@dataclass
class PRPerformance:
    first_commit_to_open: int = -1
    first_review_time: int = -1
    rework_time: int = -1
    merge_time: int = -1
    merge_to_deploy: int = -1
    cycle_time: int = -1
    blocking_reviews: int = -1
    approving_reviews: int = -1
    requested_reviews: int = -1
    prs_authored_count: int = -1
    additions: int = -1
    deletions: int = -1
    rework_cycles: int = -1
    lead_time: int = -1
