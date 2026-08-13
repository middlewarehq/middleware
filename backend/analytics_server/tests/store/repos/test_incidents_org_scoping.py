from unittest.mock import MagicMock

from mhq.store.models.incidents import IncidentProvider, IncidentType
from mhq.store.repos.incidents import IncidentsRepoService

# CLUSTOX: cross-tenant incident collision fix. ticket.key ("PROJ-123")
# is site-local, not globally unique -- two orgs' Jira sites can land
# on the same key, so the lookup used to resolve/upsert a Jira-sourced
# incident must be scoped by org_id, not just (key, incident_type,
# provider). See get_incident_by_key_type_provider_and_org's own
# docstring and etl_jira_incidents_handler.py's _to_incident.


def _service_with_mock_db() -> (IncidentsRepoService, MagicMock):
    db = MagicMock()
    service = IncidentsRepoService()
    service._db = db
    return service, db


class TestGetIncidentByKeyTypeProviderAndOrg:
    def test_joins_through_org_incident_service_before_filtering(self):
        service, db = _service_with_mock_db()
        query = db.session.query.return_value
        joined_once = query.join.return_value
        joined_twice = joined_once.join.return_value

        service.get_incident_by_key_type_provider_and_org(
            "org-1", "PROJ-123", IncidentType.JIRA_ISSUE, IncidentProvider.JIRA
        )

        # Two joins -- Incident -> IncidentOrgIncidentServiceMap ->
        # OrgIncidentService -- are what make an org_id filter possible
        # at all, since Incident carries no org_id column of its own.
        assert query.join.call_count == 1
        assert joined_once.join.call_count == 1
        joined_twice.filter.assert_called_once()
        joined_twice.filter.return_value.one_or_none.assert_called_once()

    def test_two_orgs_with_the_same_ticket_key_resolve_independently(self):
        # The actual regression: org A's incident for "PROJ-1" must not
        # be returned when org B looks up its own "PROJ-1".
        service, db = _service_with_mock_db()
        org_a_incident = MagicMock()
        org_b_incident = None  # org B has no incident for this key yet

        db.session.query.return_value.join.return_value.join.return_value.filter.return_value.one_or_none.side_effect = [
            org_a_incident,
            org_b_incident,
        ]

        result_a = service.get_incident_by_key_type_provider_and_org(
            "org-a", "PROJ-1", IncidentType.JIRA_ISSUE, IncidentProvider.JIRA
        )
        result_b = service.get_incident_by_key_type_provider_and_org(
            "org-b", "PROJ-1", IncidentType.JIRA_ISSUE, IncidentProvider.JIRA
        )

        assert result_a is org_a_incident
        assert result_b is None
