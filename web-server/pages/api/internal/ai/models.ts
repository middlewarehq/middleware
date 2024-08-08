import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';

const getSchema = yup.object().shape({});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(getSchema, async (_req, res) => {
  const response = await handleRequest('ai/models', { method: 'GET' });
  res.send(Object.keys(response));
});

export default endpoint.serve();
