# CLUSTOX: recorded from a real Jenkins pipeline build. Shape matters more than
# values -- these encode the assumptions the handler makes about the API.
from typing import Dict


def get_jenkins_build_dict(
    number: int = 42,
    result: str = "SUCCESS",
    timestamp: int = 1754827200000,  # 2025-08-10T12:00:00Z
    duration: int = 125000,
    url: str = "https://jenkins.example.com/job/deploy-api/42/",
    building: bool = False,
    user_id: str = "hamad",
    branch_name: str = "origin/main",
    sha: str = "a1b2c3d4e5f6",
) -> Dict:
    return {
        "number": number,
        "result": result,
        "timestamp": timestamp,
        "duration": duration,
        "url": url,
        "building": building,
        "actions": [
            {"causes": [{"userId": user_id, "shortDescription": "Started by user"}]},
            {"lastBuiltRevision": {"SHA1": sha, "branch": [{"name": branch_name}]}},
        ],
    }


def get_jenkins_build_dict_without_git_plugin(**kwargs) -> Dict:
    """A freestyle job with no SCM: no branch, no revision, no user cause."""
    build = get_jenkins_build_dict(**kwargs)
    build["actions"] = [{}]
    return build
