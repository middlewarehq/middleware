import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';

const pathSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.POST(nullSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send({});
  }

  res.send(await syncReposForOrg(req.payload.org_id));
});

export const syncReposForOrg = (org_id: ID) =>
  Promise.all([
    handleRequest(`/orgs/${org_id}/sync_repos`, { method: 'POST' }),
    handleRequest(`/orgs/${org_id}/sync_workflows`, { method: 'POST' })
  ]);

export default endpoint.serve();
