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


BASE_URL = "https://jenkins.example.com"

FOLDER_CLASS = "com.cloudbees.hudson.plugins.folder.Folder"
MULTIBRANCH_CLASS = (
    "org.jenkinsci.plugins.workflow.multibranch.WorkflowMultiBranchProject"
)
PIPELINE_CLASS = "org.jenkinsci.plugins.workflow.job.WorkflowJob"
FREESTYLE_CLASS = "hudson.model.FreeStyleProject"


def _node(job_class: str, full_name: str, jobs=None) -> Dict:
    node = {
        "_class": job_class,
        "name": full_name.split("/")[-1],
        "fullName": full_name,
        "url": f"{BASE_URL}/{'/'.join('job/' + s for s in full_name.split('/'))}/",
    }
    if jobs is not None:
        node["jobs"] = jobs
    return node


def get_jenkins_nested_jobs_dict() -> Dict:
    """
    A folder-organised Jenkins, the layout the flat tree could not see past.
    Note "platform/tooling/nested": a folder sitting at the deepest level the
    tree asks for, so it comes back with no "jobs" key at all and only its
    _class marks it as a container.
    """
    return {
        "jobs": [
            _node(FREESTYLE_CLASS, "deploy-legacy"),
            _node(
                FOLDER_CLASS,
                "platform",
                jobs=[
                    _node(PIPELINE_CLASS, "platform/deploy-api"),
                    _node(
                        MULTIBRANCH_CLASS,
                        "platform/web",
                        jobs=[_node(PIPELINE_CLASS, "platform/web/main")],
                    ),
                    _node(
                        FOLDER_CLASS,
                        "platform/tooling",
                        jobs=[
                            _node(FOLDER_CLASS, "platform/tooling/nested"),
                            _node(PIPELINE_CLASS, "platform/tooling/lint"),
                        ],
                    ),
                ],
            ),
            _node(FOLDER_CLASS, "empty", jobs=[]),
        ]
    }
