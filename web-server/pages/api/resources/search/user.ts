import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Columns, Table } from '@/constants/db';
import { db } from '@/utils/db';

const getSchema = yup.object().shape({
  name: yup.string().optional().nullable(),
  org_id: yup.string().uuid().required(),
  exclude_users: yup.array().of(yup.string().uuid()).optional()
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  const { name, org_id } = req.payload;

  const query = db(Table.Users)
    .select('*')
    .where(Columns[Table.Users].org_id, org_id)
    .andWhere(Columns[Table.Team].is_deleted, false);

  if (req.payload.exclude_users?.length) {
    query.whereNotIn('id', req.payload.exclude_users);
  }
  if (!name) return res.send(await query);
  res.send(await query.whereILike('name', `%${name}%`));
});

export default endpoint.serve();
