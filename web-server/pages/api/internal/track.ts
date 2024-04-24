import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';

const postSchema = yup.object().shape({});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.POST(postSchema, async (_req, res) => {
  res.send({ success: true });
});

export default endpoint.serve();
