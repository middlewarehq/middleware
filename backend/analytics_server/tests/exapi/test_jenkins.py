from datetime import datetime

import pytz

from mhq.exapi.jenkins import JenkinsApiService, job_path


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
