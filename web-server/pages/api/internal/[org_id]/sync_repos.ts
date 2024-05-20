import * as yup from 'yup';

import { handleSyncServerRequest } from '@/api-helpers/axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Columns, Table } from '@/constants/db';
import { db } from '@/utils/db';

const pathSchema = yup.object().shape({
  org_id: yup.string().required()
});

const endpoint = new Endpoint(pathSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  const { org_id } = req.payload;
  return res.send(await getForcedSyncedAt(org_id));
});

endpoint.handle.POST(nullSchema, async (req, res) => {
  const { org_id } = req.payload;

  await syncReposForOrg();
  const results = await db(Table.UIPreferences)
    .insert({
      entity_type: 'ORG',
      entity_id: org_id,
      setting_type: 'LAST_FORCED_SYNC_AT',
      data: {
        last_force_synced_at: new Date()
      },
      setter_type: 'ORG'
    })
    .onConflict([
      Columns[Table.UIPreferences].setting_type,
      Columns[Table.UIPreferences].entity_type,
      Columns[Table.UIPreferences].entity_id
    ])
    .merge()
    .returning('*');
  return res.send(results[0]?.data ?? { last_force_synced_at: null });
});

export default endpoint.serve();

export const getForcedSyncedAt = async (
  org_id: string
): Promise<{ last_force_synced_at: Date | null }> => {
  const results = await db(Table.UIPreferences)
    .select(Columns[Table.UIPreferences].data)
    .where(Columns[Table.UIPreferences].entity_id, org_id)
    .andWhere(Columns[Table.UIPreferences].setting_type, 'LAST_FORCED_SYNC_AT');
  return {
    last_force_synced_at: results[0]?.data?.last_force_synced_at ?? null
  };
};

export const syncReposForOrg = () =>
  handleSyncServerRequest(`/sync`, { method: 'POST' });
