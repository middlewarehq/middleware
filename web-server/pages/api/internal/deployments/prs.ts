import * as yup from 'yup';

import { mockDeploymentPrs } from '@/api/internal/team/[team_id]/deployment_prs';
import { handleRequest } from '@/api-helpers/axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';
import { adaptPr } from '@/api-helpers/pr';
import { BasePR } from '@/types/resources';

const getSchema = yup.object().shape({
  deployment_id: yup.string().required()
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) return res.send(mockDeploymentPrs);

  const { deployment_id } = req.payload;
  return res.send(
    await handleRequest<{ data: BasePR[]; total_count: number }>(
      `/deployments/${deployment_id}/prs`
    ).then((r) => r.data.map(adaptPr))
  );
});

export default endpoint.serve();
