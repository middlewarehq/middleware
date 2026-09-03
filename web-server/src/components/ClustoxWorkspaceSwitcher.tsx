import { FormControl, InputLabel, MenuItem, Select } from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

import { useClustoxUser } from '@/hooks/useClustoxUser';

type Workspace = { id: string; name: string };

/**
 * CLUSTOX: lets a SuperAdmin choose which workspace they are looking at.
 *
 * A SuperAdmin owns no workspace, but every dashboard in the app is
 * workspace-scoped, so without a selection there is nothing to show. This is a
 * viewing control, not a permission one -- a SuperAdmin may reach every
 * workspace regardless of what is selected.
 */
export const ClustoxWorkspaceSwitcher = () => {
  const { isSuperadmin, loading } = useClustoxUser();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [current, setCurrent] = useState<string>('');

  const load = useCallback(async () => {
    const [wsRes, sessionRes] = await Promise.all([
      fetch('/api/clustox/workspaces'),
      fetch('/api/auth/session')
    ]);
    if (!wsRes.ok) return;

    setWorkspaces(await wsRes.json());

    if (sessionRes.ok) {
      const session = await sessionRes.json();
      if (session?.org?.id) setCurrent(session.org.id);
    }
  }, []);

  useEffect(() => {
    if (!loading && isSuperadmin) load();
  }, [loading, isSuperadmin, load]);

  const onChange = async (orgId: string) => {
    setCurrent(orgId);
    await fetch('/api/clustox/workspaces', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ org_id: orgId })
    });
    // Full reload: the workspace is resolved server-side per request, and
    // every cached dashboard slice belongs to the previous workspace.
    window.location.reload();
  };

  if (loading || !isSuperadmin || workspaces.length === 0) return null;

  return (
    <FormControl size="small" fullWidth sx={{ px: 2, pb: 1 }}>
      <InputLabel id="workspace-label" sx={{ pl: 2 }}>
        Workspace
      </InputLabel>
      <Select
        labelId="workspace-label"
        label="Workspace"
        value={current}
        onChange={(e) => onChange(e.target.value as string)}
      >
        {workspaces.map((w) => (
          <MenuItem key={w.id} value={w.id}>
            {w.name}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
