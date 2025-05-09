import unittest
from unittest.mock import patch

from mhq.exapi.github import GithubApiService, PAGE_SIZE


class DummyGithub:
    def __init__(self, token, base_url=None, per_page=None):
        self.token = token
        self.base_url = base_url
        self.per_page = per_page


class TestGithubApiService(unittest.TestCase):

    @patch("mhq.exapi.github.Github", new=DummyGithub)
    def test_default_domain_sets_standard_api_url(self):
        token = "deadpool"
        service = GithubApiService(access_token=token, domain=None)
        self.assertEqual(service.base_url, "https://api.github.com")
        self.assertIsInstance(service._g, DummyGithub)
        self.assertEqual(service._g.token, token)
        self.assertEqual(service._g.base_url, "https://api.github.com")
        self.assertEqual(service._g.per_page, PAGE_SIZE)

    @patch("mhq.exapi.github.Github", new=DummyGithub)
    def test_empty_string_domain_uses_default_url(self):
        token = "deadpool"
        service = GithubApiService(access_token=token, domain="")
        self.assertEqual(service.base_url, "https://api.github.com")
        self.assertEqual(service._g.base_url, "https://api.github.com")

    @patch("mhq.exapi.github.Github", new=DummyGithub)
    def test_custom_domain_appends_api_v3(self):
        token = "deadpool"
        custom_domain = "https://github.sujai.com"
        service = GithubApiService(access_token=token, domain=custom_domain)
        expected = f"{custom_domain}/api/v3"
        self.assertEqual(service.base_url, expected)
        self.assertEqual(service._g.base_url, expected)
