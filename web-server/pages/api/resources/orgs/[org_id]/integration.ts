import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Integration } from '@/constants/integrations';
import { db } from '@/utils/db';

const pathnameSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const deleteSchema = yup.object().shape({
  provider: yup.string().oneOf(Object.values(Integration)).required()
});

const endpoint = new Endpoint(pathnameSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send([]);
  }

  const response = await db('Integration')
    .select('*')
    .where('org_id', req.payload.org_id);

  res.send(response.reduce((map, row) => ({ ...map, [row.name]: true }), {}));
});

endpoint.handle.DELETE(deleteSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send({ status: 'OK' });
  }

  const { org_id, provider } = req.payload;

  await db('Integration')
    .delete()
    .where({
      org_id,
      name: provider
    })
    .returning('*');

  res.send({ status: 'OK' });
});

export default endpoint.serve();
