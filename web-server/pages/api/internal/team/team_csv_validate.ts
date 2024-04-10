import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';

const schema = yup.object().shape({
  data: yup.string().required()
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.POST(schema, async (req, res) => {
  const { data } = req.payload;
  return res.send(
    await handleRequest(`/orgs/teams/bulk-creation-errors`, {
      data: { data },
      method: 'POST'
    })
  );
});

export default endpoint.serve();
