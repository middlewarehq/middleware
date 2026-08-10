import * as yup from 'yup';

import { Endpoint } from '@/api-helpers/global';
import { internal } from '@/api-helpers/axios';

// CLUSTOX: proxies the workspace's Jenkins job list. org_id is validated by
// Endpoint.serve(), which asserts the caller may act on that workspace.
const getSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(getSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const jobs = await internal.get(
    `/orgs/${req.payload.org_id}/integrations/jenkins/jobs`
  );
  res.send({ jobs: jobs.data });
});

export default endpoint.serve();
