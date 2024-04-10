import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';
import { OrgIncidentServicesApiResponse } from '@/types/resources';

const pathSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  const { org_id } = req.payload;
  return res.send(getSelectedIncidentServices(org_id));
});

export const getSelectedIncidentServices = (org_id: ID) =>
  handleRequest<OrgIncidentServicesApiResponse>(
    `/orgs/${org_id}/incident_services`
  ).then((r) => r.incident_services);

export default endpoint.serve();
