import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';

const getSchema = yup.object().shape({
  name: yup.string().optional()
});

const endpoint = new Endpoint(nullSchema, { unauthenticated: true });

endpoint.handle.GET(getSchema, async (req, res) => {
  const { name } = req.payload;

  return res.status(400).send({ lol: 1 });
  res
    .status(200)
    .send(name ? { hello: name } : { message: 'Usage: ?name=<something>' });
});

export default endpoint.serve();
