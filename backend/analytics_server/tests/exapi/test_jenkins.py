from datetime import datetime

import pytest
import pytz
import requests

from mhq.exapi import jenkins as jenkins_module
from mhq.exapi.jenkins import JOB_TREE, JenkinsApiService, job_path
from tests.factories.models.exapi.jenkins import get_jenkins_nested_jobs_dict


def test_job_path_encodes_a_top_level_job():
    assert job_path("deploy-api") == "job/deploy-api"


def test_job_path_encodes_a_folder_job():
    # Jenkins addresses nested jobs by repeating /job/ per segment.
    assert job_path("platform/deploy-api") == "job/platform/job/deploy-api"


def test_get_builds_filters_out_builds_at_or_before_the_bookmark():
    class FakeResponse:
        status_code = 200

        @staticmethod
        def json():
            return {
                "builds": [
                    {"number": 3, "timestamp": 3000, "result": "SUCCESS"},
                    {"number": 2, "timestamp": 2000, "result": "SUCCESS"},
                    {"number": 1, "timestamp": 1000, "result": "SUCCESS"},
                ]
            }

        @staticmethod
        def raise_for_status():
            return None

    service = JenkinsApiService("https://jenkins.example.com", "user", "token")
    service._get = lambda path: FakeResponse()

    bookmark = datetime.fromtimestamp(2, tz=pytz.UTC)
    builds = service.get_builds("deploy-api", bookmark)

    assert [b["number"] for b in builds] == [3]


class FakeJsonResponse:
    status_code = 200

    def __init__(self, payload):
        self._payload = payload

    def json(self):
        return self._payload

    @staticmethod
    def raise_for_status():
        return None


def _service_returning(payload):
    service = JenkinsApiService("https://jenkins.example.com", "user", "token")
    service.requested_paths = []

    def _get(path):
        service.requested_paths.append(path)
        return FakeJsonResponse(payload)

    service._get = _get
    return service


def test_the_job_tree_recurses_far_enough_for_folder_layouts():
    # A flat "jobs[...]" tree stops at the top level, so on a folder-organised
    # Jenkins the picker offers folders instead of jobs.
    assert JOB_TREE.count("jobs[") == 3


def test_get_jobs_returns_nested_jobs_and_not_their_containers():
    service = _service_returning(get_jenkins_nested_jobs_dict())

    jobs = service.get_jobs()

    assert [job["full_name"] for job in jobs] == [
        "deploy-legacy",
        "platform/deploy-api",
        "platform/web/main",
        "platform/tooling/lint",
    ]
    # Mapping a folder or a multibranch project produces a URL with no "builds"
    # key, which the handler reports as "No builds found" -- zero deployments
    # forever, and no error anywhere.
    assert not {"platform", "platform/web", "platform/tooling"} & {
        job["full_name"] for job in jobs
    }
    assert jobs[2]["name"] == "main"
    assert jobs[1]["url"].endswith("/job/platform/job/deploy-api/")


def test_get_jobs_survives_an_instance_with_no_jobs():
    assert _service_returning({}).get_jobs() == []


class DribblingResponse:
    """A Jenkins that sends one byte just inside every read timeout."""

    status_code = 200

    def __init__(self, clock, seconds_per_chunk):
        self._clock = clock
        self._seconds_per_chunk = seconds_per_chunk
        self.closed = False

    def iter_content(self, chunk_size):
        while True:
            self._clock["now"] += self._seconds_per_chunk
            yield b"x"

    def close(self):
        self.closed = True


def _patch_clock_and_response(monkeypatch, response, clock):
    monkeypatch.setattr(jenkins_module, "monotonic", lambda: clock["now"])
    monkeypatch.setattr(jenkins_module.requests, "get", lambda *a, **kw: response)


def test_a_dribbling_jenkins_hits_the_total_ceiling(monkeypatch):
    clock = {"now": 0.0}
    response = DribblingResponse(clock, seconds_per_chunk=29)
    _patch_clock_and_response(monkeypatch, response, clock)

    service = JenkinsApiService(
        "https://jenkins.example.com", "user", "token", max_seconds=60
    )

    # Without a wall-clock ceiling this loops forever: requests' read timeout
    # is between bytes, and the sequential sync loop stalls behind it.
    with pytest.raises(requests.exceptions.Timeout):
        service.check_pat()

    assert response.closed is True


def test_a_prompt_jenkins_is_read_in_full(monkeypatch):
    clock = {"now": 0.0}

    class PromptResponse:
        status_code = 200
        closed = False

        @staticmethod
        def iter_content(chunk_size):
            yield b'{"jobs": '
            yield b"[]}"

        def close(self):
            PromptResponse.closed = True

    _patch_clock_and_response(monkeypatch, PromptResponse(), clock)

    service = JenkinsApiService("https://jenkins.example.com", "user", "token")

    assert service.get_jobs() == []
    assert PromptResponse.closed is True


def test_an_http_error_is_raised_rather_than_parsed(monkeypatch):
    clock = {"now": 0.0}

    class ForbiddenResponse:
        status_code = 403

        @staticmethod
        def iter_content(chunk_size):
            yield b"forbidden"

        def close(self):
            return None

    _patch_clock_and_response(monkeypatch, ForbiddenResponse(), clock)

    service = JenkinsApiService("https://jenkins.example.com", "user", "token")

    assert service.check_pat() is False
    with pytest.raises(requests.HTTPError):
        service.get_jobs()
