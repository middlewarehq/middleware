import { countSuperadmins, createUser } from './queries';

export const bootstrapSuperadmin = async (): Promise<void> => {
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

  // No workspace: a superadmin sits above every workspace rather than owning
  // one, so createUser leaves org_id null for this role.
  await createUser({
    name: 'Superadmin',
    email,
    password,
    role: 'SUPERADMIN',
    teamIds: []
  });

  console.info(`[CLUSTOX] Bootstrapped superadmin ${email}`);
};
