import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';

const getSchema = yup.object().shape({
  log_text: yup.string().required()
});

const endpoint = new Endpoint(nullSchema);

// @ts-ignore
endpoint.handle.GET(getSchema, async (req, res) => {
  return res.send(await handleRequest(`/hello`));
});

export default endpoint.serve();
