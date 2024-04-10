import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Columns, Table } from '@/constants/db';
import { Integration } from '@/constants/integrations';
import { db, getFirstRow } from '@/utils/db';

const getSchema = yup.object().shape({
  user_id: yup.string().uuid().required()
});

const deleteSchema = yup.object().shape({
  provider: yup.string().oneOf(Object.values(Integration)),
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const data = await db(Table.UserIdentity)
    .select(Columns[Table.UserIdentity].provider)
    .where(Columns[Table.UserIdentity].user_id, req.payload.user_id);

  res.send({ integrations: data });
});

endpoint.handle.DELETE(deleteSchema, async (req, res) => {
  const data = await db(Table.Integration)
    .delete()
    .where({
      [Columns[Table.Integration].org_id]: req.payload.org_id,
      [Columns[Table.Integration].name]: req.payload.provider
    })
    .returning('*')
    .then(getFirstRow);

  res.send(data);
});

export default endpoint.serve();
