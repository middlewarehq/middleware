// CLUSTOX: seed the first superadmin on server start. The NEXT_RUNTIME check
// keeps this off the Edge runtime, where knex cannot run.
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { bootstrapSuperadmin } = await import('@/auth/bootstrap');
    await bootstrapSuperadmin();
  }
}
