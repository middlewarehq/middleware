import gzip
import json
import socket
import threading
from datetime import datetime
from time import monotonic, sleep

import pytest
import pytz
import requests

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


# CLUSTOX: the ceiling tests below drive a real socket, not a fake response.
# The fake they replace yielded one byte per iter_content() iteration, which
# requests never does: urllib3 blocks until it has the whole requested chunk,
# so the deadline between chunks was not consulted until 64 KiB had arrived.
# The fake passed against an implementation that could not bound a real
# connection -- confidence with nothing behind it.
class LocalJenkins:
    """
    An HTTP server on 127.0.0.1 that declares a Content-Length and then hands
    the body over in pieces, optionally slowly. Content-Length (not chunked
    transfer encoding) is the case that matters: chunked responses happen to
    yield per HTTP chunk, so they hide the bug.
    """

    def __init__(
        self,
        body: bytes,
        chunk_size: int = None,
        interval: float = 0.0,
        status_line: bytes = b"HTTP/1.1 200 OK",
        headers=(),
    ):
        self._body = body
        self._chunk_size = chunk_size or max(len(body), 1)
        self._interval = interval
        self._status_line = status_line
        self._headers = list(headers)
        self._stop = threading.Event()
        self._socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self._socket.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        self._socket.bind(("127.0.0.1", 0))
        self._socket.listen(8)
        self._socket.settimeout(0.25)
        self._thread = threading.Thread(target=self._serve, daemon=True)

    @property
    def url(self) -> str:
        return "http://127.0.0.1:{}".format(self._socket.getsockname()[1])

    def __enter__(self):
        self._thread.start()
        return self

    def __exit__(self, *exc_info):
        self._stop.set()
        self._thread.join(timeout=5)
        self._socket.close()
        return False

    def _serve(self):
        while not self._stop.is_set():
            try:
                connection, _ = self._socket.accept()
            except socket.timeout:
                continue
            except OSError:
                return
            with connection:
                try:
                    self._respond(connection)
                except OSError:
                    # The client hit its ceiling and hung up mid-dribble, which
                    # is exactly what these tests are checking for.
                    pass

    def _respond(self, connection):
        connection.settimeout(5)
        request = b""
        while b"\r\n\r\n" not in request:
            received = connection.recv(4096)
            if not received:
                return
            request += received

        head = [
            self._status_line,
            b"Content-Length: %d" % len(self._body),
            b"Connection: close",
        ]
        head.extend(self._headers)
        connection.sendall(b"\r\n".join(head) + b"\r\n\r\n")

        for start in range(0, len(self._body), self._chunk_size):
            if self._stop.is_set():
                return
            end = start + self._chunk_size
            connection.sendall(self._body[start:end])
            if self._interval:
                sleep(self._interval)


def _service(url, max_seconds=5):
    return JenkinsApiService(
        url, "user", "token", timeout=(2, 2), max_seconds=max_seconds
    )


def test_a_dribbling_jenkins_is_cut_off_at_the_ceiling():
    # 4000 bytes handed over 50 at a time every 50ms: four seconds to complete,
    # with every gap comfortably inside the read timeout, so nothing but the
    # total ceiling can stop it. The whole body is under one 64 KiB chunk, so
    # an implementation that checks its deadline between iter_content() chunks
    # blocks for the full four seconds before looking at the clock even once.
    with LocalJenkins(b"x" * 4000, chunk_size=50, interval=0.05) as jenkins:
        service = _service(jenkins.url, max_seconds=1)

        started = monotonic()
        with pytest.raises(requests.exceptions.Timeout) as raised:
            service.check_pat()
        elapsed = monotonic() - started

    assert "ceiling" in str(raised.value)
    # Generous, and still nowhere near the 4s the body needs to finish. The
    # sequential sync loop is the thing being protected: every workspace behind
    # this one waits for it.
    assert elapsed < 2.5, f"ceiling did not bound the read: took {elapsed:.1f}s"


def test_a_prompt_jenkins_is_read_in_full():
    with LocalJenkins(b'{"jobs": []}') as jenkins:
        assert _service(jenkins.url).get_jobs() == []


def test_a_body_larger_than_one_read_is_reassembled():
    # read1() returns whatever is available rather than a full chunk, so the
    # loop has to keep going until EOF instead of stopping at the first short
    # read.
    payload = {
        "jobs": [
            {
                "_class": "hudson.model.FreeStyleProject",
                "name": f"deploy-{index}",
                "fullName": f"deploy-{index}",
                "url": f"http://jenkins/job/deploy-{index}/",
            }
            for index in range(2000)
        ]
    }
    body = json.dumps(payload).encode()
    assert len(body) > 64 * 1024

    with LocalJenkins(body, chunk_size=1024) as jenkins:
        jobs = _service(jenkins.url).get_jobs()

    assert len(jobs) == 2000
    assert jobs[-1]["full_name"] == "deploy-1999"


def test_a_gzipped_response_is_decoded():
    # requests advertises gzip on every request. Reading response.raw without
    # decode_content hands json.loads a gzip stream.
    body = gzip.compress(json.dumps(get_jenkins_nested_jobs_dict()).encode())

    with LocalJenkins(body, headers=[b"Content-Encoding: gzip"]) as jenkins:
        jobs = _service(jenkins.url).get_jobs()

    assert [job["full_name"] for job in jobs] == [
        "deploy-legacy",
        "platform/deploy-api",
        "platform/web/main",
        "platform/tooling/lint",
    ]


def test_an_http_error_is_raised_rather_than_parsed():
    with LocalJenkins(b"forbidden", status_line=b"HTTP/1.1 403 Forbidden") as jenkins:
        service = _service(jenkins.url)

        assert service.check_pat() is False
        with pytest.raises(requests.HTTPError):
            service.get_jobs()
