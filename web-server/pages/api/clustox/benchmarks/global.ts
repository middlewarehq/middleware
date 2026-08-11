import * as yup from 'yup';

import { Endpoint, nullSchema } from '@/api-helpers/global';
import { internal } from '@/api-helpers/axios';
import { assertRole } from '@/auth/guard';

// CLUSTOX: the global baseline is superadmin-only. The Flask layer trusts the
// internal token and has no notion of who is calling, so the role check has to
// live here.
const putSchema = yup.object().shape({
  lead_time: yup.number().min(0).nullable().optional(),
  deployment_frequency: yup.number().min(0).nullable().optional(),
  change_failure_rate: yup.number().min(0).max(100).nullable().optional(),
  mean_time_to_recovery: yup.number().min(0).nullable().optional()
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  assertRole((req as any).session, 'SUPERADMIN');

  const result = await internal.get('/settings/global', {
    params: { setting_type: 'BENCHMARK_SETTING' }
  });
  res.send(result.data);
});

endpoint.handle.PUT(putSchema, async (req, res) => {
  assertRole((req as any).session, 'SUPERADMIN');

  const result = await internal.put('/settings/global', {
    setting_type: 'BENCHMARK_SETTING',
    setting_data: req.payload
  });
  res.send(result.data);
});

export default endpoint.serve();
