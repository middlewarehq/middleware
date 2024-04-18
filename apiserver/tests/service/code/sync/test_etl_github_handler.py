from datetime import datetime

import pytz

from dora.service.code.sync.etl_github_handler import GithubETLHandler
from dora.utils.string import uuid4_str

ORG_ID = uuid4_str()


def test__dt_from_github_dt_string_given_date_string_returns_correct_datetime():
    date_string = "2024-04-18T10:53:15Z"
    expected = datetime(2024, 4, 18, 10, 53, 15, tzinfo=pytz.UTC)
    assert GithubETLHandler._dt_from_github_dt_string(date_string) == expected
