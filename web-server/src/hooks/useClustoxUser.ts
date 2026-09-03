import { useCallback, useEffect, useState } from 'react';

import { ClustoxRole } from '@/auth/types';

export type ClustoxUser = {
  user_id: string;
  email: string;
  name: string;
  role: ClustoxRole;
  /** Workspace to act on. Server-resolved, never persisted client-side. */
  org_id: string | null;
};

/**
 * The signed-in user's identity and current role.
 *
 * Read from /api/clustox/me rather than from AuthContext, whose `role` field
 * upstream hardcodes to UserRole.MOM. Use it for presentation decisions only;
 * authorization is enforced server-side on every route.
 */
export const useClustoxUser = () => {
  const [user, setUser] = useState<ClustoxUser | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/clustox/me');
      setUser(res.ok ? await res.json() : null);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return {
    user,
    loading,
    isSuperadmin: user?.role === 'SUPERADMIN',
    orgId: user?.org_id ?? null
  };
};
