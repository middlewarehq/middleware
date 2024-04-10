import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { getSelectedIncidentServices } from '@/api/internal/[org_id]/incident_services';
import {
  TeamIncidentServicesApiResponse,
  TeamSelectedIncidentServicesBFFApiResponse,
  IncidentProviderOrgTeam,
  IncidentProviderAssignedTeam
} from '@/types/resources';

const pathSchema = yup.object().shape({
  team_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const putSchema = yup.object().shape({
  service_ids: yup.array().of(yup.string().uuid()).required(),
  incident_team_ids: yup.array().of(yup.string().uuid()).required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { team_id, org_id } = req.payload;

  const [
    org_incident_services,
    incident_provider_all_teams,
    team_incident_services,
    incident_provider_assigned_teams
  ] = await Promise.all([
    getSelectedIncidentServices(org_id),
    handleRequest<{
      incident_teams: IncidentProviderOrgTeam[];
    }>(`/orgs/${org_id}/incident_teams
    `).then((r) => r.incident_teams),
    handleRequest<TeamIncidentServicesApiResponse>(`/teams/${team_id}/team_incident_services
  `).then((r) => r.team_incident_services),
    handleRequest<{
      team_incident_services: IncidentProviderAssignedTeam[];
    }>(`/teams/${team_id}/team_incident_teams
  `).then((r) =>
      r.team_incident_services.map((t) => {
        t.name = t.team_name;
        return t;
      })
    )
  ]);

  return res.send({
    org_incident_services,
    incident_provider_all_teams,
    team_incident_services,
    incident_provider_assigned_teams
  } as TeamSelectedIncidentServicesBFFApiResponse);
});
endpoint.handle.PUT(putSchema, async (req, res) => {
  const { team_id, service_ids, incident_team_ids } = req.payload;

  const [team_incident_services, incident_provider_teams] = await Promise.all([
    handleRequest<TeamIncidentServicesApiResponse>(
      `/teams/${team_id}/team_incident_services`,
      {
        method: 'PUT',
        data: { service_ids }
      }
    ).then((r) => r.team_incident_services),
    handleRequest<TeamIncidentServicesApiResponse>(
      `/teams/${team_id}/team_incident_teams`,
      {
        method: 'PUT',
        data: { org_incident_team_ids: incident_team_ids }
      }
    ).then((r) => r.team_incident_services)
  ]);
  return res.send({ team_incident_services, incident_provider_teams });
});

export default endpoint.serve();
