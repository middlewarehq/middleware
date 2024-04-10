import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';

type OrgIncidentProviderType = { incident_providers: string[] };

const pathSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(null, async (req, res) => {
  const { org_id } = req.payload;
  return res.send(await getOrgIncidentsProviders(org_id));
});

export const getOrgIncidentsProviders = async (org_id: ID) => {
  return await handleRequest<OrgIncidentProviderType>(
    `/orgs/${org_id}/incident_providers`
  );
};

export default endpoint.serve();
