"""
This test has no actual use case, just to demostrate how to configure a test with pytest and unittest
This test is only to show how to configure a test with pytest and unittest
uninttest has a fixture called TestCase that can be used to create a test case
But in this case we are using pytest to create the fixture
So we cannot stick to the genral setUp method of unittest.Testcase
Notice below that we are using pytest.fixture(autouse=True) to make the fixture run before the test
and our test setup method is named setup_and_teardown and not setUp or tearDown
inside the setup_and_teardown method we are using yield,
so everything before yield is setup and everything after yield is teardown
"""

from unittest import TestCase
import pytest


class TestHelloWorld(TestCase):
    @pytest.fixture(autouse=True)
    def setup_and_teardown(self, client):
        self.client = client
        yield
        self.teardown()

    def test_hello_world(self):
        response = self.client.get("/")
        assert response.status_code == 200
        assert response.json == {"message": "hello world"}

    def test_hello_world_fail(self):
        response = self.client.get("/")
        assert response.status_code == 200
        assert response.json != {"message": "hello"}

    def teardown(self):
        print("teardown")
        pass
