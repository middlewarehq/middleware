import * as yup from 'yup';

import { internal } from '@/api-helpers/axios';
import { Endpoint, nullSchema } from '@/api-helpers/global';
import { assertRole } from '@/auth/guard';

// CLUSTOX: writing the global baseline is superadmin-only -- one
// superadmin's numbers become every unset team's targets, so that stays
// locked down. The Flask layer trusts the internal token and has no notion
// of who is calling, so that role check has to live here.
const putSchema = yup.object().shape({
  lead_time: yup.number().min(0).nullable().optional(),
  deployment_frequency: yup.number().min(0).nullable().optional(),
  change_failure_rate: yup.number().min(0).max(100).nullable().optional(),
  mean_time_to_recovery: yup.number().min(0).nullable().optional(),
  // CLUSTOX: no `.max()`. Percent is the only bounded metric; an average PR
  // of 5,000 lines is a bad number, not an invalid one, and the baseline has
  // to be able to record where teams actually are.
  lines_of_code: yup.number().min(0).nullable().optional()
});

const endpoint = new Endpoint(nullSchema);

// CLUSTOX: reading the global baseline is deliberately NOT superadmin-gated.
// These four numbers already reach every admin's own dashboard as resolved
// target lines on the metric cards (see resolve_benchmarks / the
// `benchmarks` field on team DORA metrics) -- they are not a secret, they're
// the other half of "why did my team's card say this target." Gating the
// read behind SUPERADMIN hid the number from the one form whose entire job
// is to explain where an inherited target came from, with no
// confidentiality benefit, since it's already visible elsewhere to the same
// audience. `Endpoint.serve()` still requires an authenticated session
// (`this.authenticated` defaults to true and is not opted out here), so this
// is "any signed-in admin may read" -- not "anyone may read." Do not add
// `assertRole` back here without re-checking that reasoning; PUT below is
// the one that actually needs it.
endpoint.handle.GET(nullSchema, async (_req, res) => {
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
