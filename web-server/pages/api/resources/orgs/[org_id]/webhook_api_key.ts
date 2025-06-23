import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Integration } from '@/constants/integrations';
import { dec } from '@/utils/auth-supplementary';
import { db } from '@/utils/db';

const pathnameSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathnameSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  const response = await db('Integration')
    .select('*')
    .where('org_id', req.payload.org_id)
    .where('name', Integration.WEBHOOK)
    .first();

  if (!response) return res.send({ webhook_api_key: '' });
  const apiKey = dec(response.access_token_enc_chunks);

  res.send({ webhook_api_key: apiKey });
});

export default endpoint.serve();
