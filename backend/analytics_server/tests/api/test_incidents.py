import pytest
from unittest.mock import patch, MagicMock
from unittest import TestCase
from datetime import datetime

from mhq.api.incidents import Incident


class TestGetResolvedIncidents(TestCase):

    @pytest.fixture(autouse=True)
    def setup_and_teardown(self, client):
        self.client = client
        self.team_id = "651ab334-f013-eb94-aed9-03fe00000021"
        self.from_time = "2023-08-01T00:00:00+00:00"
        self.to_time = "2023-08-09T23:59:59+00:00"
        self.url = f"/teams/{self.team_id}/resolved_incidents"
        yield

    @patch("mhq.api.incidents.get_query_validator")
    @patch("mhq.api.incidents.get_incident_service")
    def test_get_resolved_incidents(self, mock_incident_service, mock_query_validator):

        mock_query_validator_instance = MagicMock()
        mock_query_validator.return_value = mock_query_validator_instance
        mock_query_validator_instance.interval_validator.return_value = (
            "interval",
            "from_time",
            "to_time",
        )
        team_validator = MagicMock()
        team_validator.return_value = None
        mock_query_validator_instance.team_validator = team_validator

        incident1 = Incident(
            id="651ab334-f013-eb94-aed9-03fe00000001",
            provider="Provider1",
            key="Key1",
            incident_number=1,
            title="Incident 1",
            status="Resolved",
            creation_date=datetime(2023, 8, 1),
            acknowledged_date=datetime(2023, 8, 2),
            resolved_date=datetime(2023, 8, 3),
            assigned_to="User1",
            assignees=["User1"],
            incident_type=MagicMock(value="incident"),
            url="http://example.com/incident1",
            meta={},
        )
        incident2 = Incident(
            id="651ab334-f013-eb94-aed9-03fe00000002",
            provider="Provider2",
            key="Key2",
            incident_number=2,
            title="Incident 2",
            status="Resolved",
            creation_date=datetime(2023, 8, 4),
            acknowledged_date=datetime(2023, 8, 5),
            resolved_date=datetime(2023, 8, 6),
            assigned_to="User2",
            assignees=["User2"],
            incident_type=MagicMock(value="incident"),
            url="http://example.com/incident2",
            meta={},
        )

        mock_incident_service_instance = MagicMock()
        mock_incident_service_instance.get_resolved_team_incidents.return_value = [
            incident1,
            incident2,
        ]
        mock_incident_service.return_value = mock_incident_service_instance

        response = self.client.get(
            self.url,
            query_string={
                "from_time": self.from_time,
                "to_time": self.to_time,
            },
        )

        print("Response status:", response.status_code)
        print("Response data:", response.get_data(as_text=True))

        assert response.status_code == 200
        json_data = response.get_json()
        assert len(json_data) == 2
        assert json_data[0]["id"] == "651ab334-f013-eb94-aed9-03fe00000001"
        assert json_data[1]["id"] == "651ab334-f013-eb94-aed9-03fe00000002"

    @patch("mhq.api.incidents.get_query_validator")
    @patch("mhq.api.incidents.get_incident_service")
    def test_get_resolved_incidents_invalid_interval(
        self, mock_incident_service, mock_query_validator
    ):
        mock_query_validator_instance = MagicMock()
        mock_query_validator.return_value = mock_query_validator_instance
        mock_query_validator_instance.interval_validator.side_effect = ValueError(
            "Invalid interval"
        )

        with pytest.raises(ValueError) as excinfo:
            self.client.get(
                self.url,
                query_string={
                    "from_time": self.from_time,
                    "to_time": self.to_time,
                },
            )

        assert "Invalid interval" in str(excinfo.value)
