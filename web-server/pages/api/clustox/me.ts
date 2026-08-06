import { Endpoint, nullSchema } from '@/api-helpers/global';
import { assertAuthenticated } from '@/auth/guard';

/**
 * The signed-in user's identity and current role.
 *
 * The UI needs the real Clustox role to decide what to show, and upstream's
 * AuthContext hardcodes `role` to UserRole.MOM. Rather than rewire that
 * context, components read from here.
 *
 * Presentation only -- every route enforces its own authorization server-side.
 */
const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(nullSchema, async (req, res) => {
  const session = assertAuthenticated((req as any).session);

  res.send({
    user_id: session.userId,
    email: session.email,
    name: session.name,
    role: session.role,
    // The workspace to act on. Resolved server-side per request, so unlike the
    // redux copy it can never be a stale value rehydrated from a previous
    // session's persisted state.
    org_id: session.orgId
  });
});

export default endpoint.serve();
