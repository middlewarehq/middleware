import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Columns, Table } from '@/constants/db';
import { selectedDBReposMock } from '@/mocks/github';
import { db } from '@/utils/db';

const getSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(getSchema, async (req, res) => {
  if (req.meta?.features?.use_mock_data) {
    return res.send(selectedDBReposMock);
  }

  const { org_id } = req.payload;

  const data = await db(Table.OrgRepo)
    .select('*')
    .where({ org_id, provider: 'github' })
    .andWhereNot(Columns[Table.OrgRepo].is_active, false);

  res.send(data);
});

export default endpoint.serve();
