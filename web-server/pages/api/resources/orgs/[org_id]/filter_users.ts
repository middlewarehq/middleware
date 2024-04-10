import * as yup from 'yup';

import { Endpoint } from '@/api-helpers/global';
import { Table } from '@/constants/db';
import { db } from '@/utils/db';

const getSchema = yup.object().shape({
  user_id: yup.string().uuid().required(),
  type: yup.string().required()
});

const pathnameSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(pathnameSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send([]);
  }

  const { org_id, user_id } = req.payload;

  const allRelations = await db('TeamRelations').select('*').where({ org_id });

  const usersAsManagers = allRelations.map((relation) => relation.user_id);
  const usersAsDirects = allRelations.map(
    (relation) => relation.related_user_id
  );

  const usersToExclude = Array.from(
    new Set([...usersAsManagers, ...usersAsDirects, user_id])
  );

  const data = await db(Table.Users)
    .select('*')
    .where({ org_id })
    .and.not.whereIn('id', usersToExclude);

  res.send(data);
});

export default endpoint.serve();
