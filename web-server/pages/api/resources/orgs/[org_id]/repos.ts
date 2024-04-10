import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { teamReposMock } from '@/mocks/repos';
import { db } from '@/utils/db';

const pathSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(teamReposMock);
  }

  const data = await db('OrgRepo')
    .select('*')
    .where('is_active', true)
    .andWhere('org_id', req.payload.org_id);

  res.send(data);
});

export default endpoint.serve();
