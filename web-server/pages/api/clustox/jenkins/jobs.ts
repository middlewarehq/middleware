import * as yup from 'yup';

import { internal } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { forwardInternalError } from '@/api-helpers/internal-error';

// CLUSTOX: proxies the workspace's Jenkins job list. org_id is validated by
// Endpoint.serve(), which asserts the caller may act on that workspace.
const getSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(getSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  // CLUSTOX: the analytics server distinguishes a base URL it refuses to fetch
  // (400, with the address and the reason) from an unreachable Jenkins (502).
  // Collapsing both into a generic failure here is what made the setup form
  // tell an admin who typed an internal hostname to check his API token.
  const jobs = await internal
    .get(`/orgs/${req.payload.org_id}/integrations/jenkins/jobs`)
    .catch(forwardInternalError);
  res.send({ jobs: jobs.data });
});

export default endpoint.serve();
