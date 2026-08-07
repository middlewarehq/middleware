import { Table } from '@/constants/db';
import { db } from '@/utils/db';

import { countSuperadmins, createUser } from './queries';

const getDefaultOrgId = async (): Promise<string | null> => {
  const row = await db(Table.Organization).select('id').first();
  return row?.id ?? null;
};

export const bootstrapSuperadmin = async (
  orgIdOverride?: string
): Promise<void> => {
  const existing = await countSuperadmins();
  if (existing > 0) return;

  const email = process.env.SUPERADMIN_EMAIL;
  const password = process.env.SUPERADMIN_PASSWORD;

  if (!email || !password) {
    // Fail loudly but do not invent a default account. A known-value fallback
    // is worse than having no superadmin at all.
    console.error(
      '[CLUSTOX] No superadmin exists and SUPERADMIN_EMAIL / SUPERADMIN_PASSWORD ' +
        'are not set. Nobody can administer this instance until they are.'
    );
    return;
  }

  const orgId = orgIdOverride ?? (await getDefaultOrgId());
  if (!orgId) {
    console.error(
      '[CLUSTOX] No organization found; cannot bootstrap superadmin.'
    );
    return;
  }

  await createUser({
    name: 'Superadmin',
    email,
    password,
    role: 'SUPERADMIN',
    teamIds: [],
    orgId
  });

  console.info(`[CLUSTOX] Bootstrapped superadmin ${email}`);
};
