import {
  Alert,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography
} from '@mui/material';
import Head from 'next/head';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { FlexBox } from '@/components/FlexBox';
import { PageLayout } from '@/types/resources';

type ClustoxRole = 'SUPERADMIN' | 'ADMIN';

type UserRow = {
  userId: string;
  email: string;
  name: string;
  role: ClustoxRole;
  teamIds: string[];
};

type Team = { id: string; name: string };

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'ADMIN' as ClustoxRole,
  team_ids: [] as string[]
};

function UsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadUsers = useCallback(async () => {
    const res = await fetch('/api/clustox/users');
    if (res.status === 403) {
      setForbidden(true);
      setLoading(false);
      return;
    }
    setUsers(await res.json());
    setLoading(false);
  }, []);

  const loadTeams = useCallback(async () => {
    const sessionRes = await fetch('/api/auth/session');
    if (!sessionRes.ok) return;
    const session = await sessionRes.json();
    const orgId = session?.org?.id;
    if (!orgId) return;

    const res = await fetch(`/api/resources/orgs/${orgId}/teams`);
    if (!res.ok) return;
    const data = await res.json();
    setTeams(data.teams || []);
  }, []);

  useEffect(() => {
    loadUsers();
    loadTeams();
  }, [loadUsers, loadTeams]);

  const teamName = (id: string) =>
    teams.find((t) => t.id === id)?.name ?? id.slice(0, 8);

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    const res = await fetch('/api/clustox/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });

    setBusy(false);

    if (!res.ok) {
      setError(
        res.status === 409
          ? 'A user with that email already exists'
          : 'Could not create user. Password must be at least 12 characters.'
      );
      return;
    }

    setForm(emptyForm);
    await loadUsers();
  };

  const onChangeTeams = async (userId: string, teamIds: string[]) => {
    await fetch(`/api/clustox/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ team_ids: teamIds })
    });
    await loadUsers();
  };

  if (loading)
    return (
      <FlexBox p={4} justifyCenter>
        <CircularProgress />
      </FlexBox>
    );

  if (forbidden)
    return (
      <Box p={4}>
        <Alert severity="warning">
          Not authorised. Only superadmins can manage users.
        </Alert>
      </Box>
    );

  return (
    <>
      <Head>
        <title>Users | MiddlewareHQ</title>
      </Head>
      <Box p={4}>
        <Typography variant="h3" mb={3}>
          Users
        </Typography>

        <Card sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" mb={2}>
            Add a user
          </Typography>
          <form onSubmit={onCreate}>
            <FlexBox gap={2} flexWrap="wrap" alignCenter>
              <TextField
                label="Name"
                value={form.name}
                required
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <TextField
                label="Email"
                type="email"
                value={form.email}
                required
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <TextField
                label="Password"
                type="password"
                value={form.password}
                required
                helperText="Minimum 12 characters"
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <FormControl sx={{ minWidth: 160 }}>
                <InputLabel id="role-label">Role</InputLabel>
                <Select
                  labelId="role-label"
                  label="Role"
                  value={form.role}
                  onChange={(e) =>
                    setForm({ ...form, role: e.target.value as ClustoxRole })
                  }
                >
                  <MenuItem value="ADMIN">Admin</MenuItem>
                  <MenuItem value="SUPERADMIN">Superadmin</MenuItem>
                </Select>
              </FormControl>
              <FormControl sx={{ minWidth: 220 }}>
                <InputLabel id="teams-label">Teams</InputLabel>
                <Select
                  labelId="teams-label"
                  label="Teams"
                  multiple
                  value={form.team_ids}
                  disabled={form.role === 'SUPERADMIN'}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      team_ids: e.target.value as string[]
                    })
                  }
                  renderValue={(selected) =>
                    (selected as string[]).map(teamName).join(', ')
                  }
                >
                  {teams.map((t) => (
                    <MenuItem key={t.id} value={t.id}>
                      {t.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button type="submit" variant="contained" disabled={busy}>
                {busy ? 'Adding...' : 'Add user'}
              </Button>
            </FlexBox>
            {form.role === 'SUPERADMIN' && (
              <Typography variant="body2" color="text.secondary" mt={1}>
                Superadmins see every team, so no team assignment is needed.
              </Typography>
            )}
            {error && (
              <Typography color="error" mt={2} role="alert">
                {error}
              </Typography>
            )}
          </form>
        </Card>

        <Card>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Role</TableCell>
                <TableCell>Teams</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.userId}>
                  <TableCell>{u.name}</TableCell>
                  <TableCell>{u.email}</TableCell>
                  <TableCell>
                    <Chip
                      label={u.role}
                      color={u.role === 'SUPERADMIN' ? 'primary' : 'default'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    {u.role === 'SUPERADMIN' ? (
                      <Typography variant="body2" color="text.secondary">
                        All teams
                      </Typography>
                    ) : (
                      <Select
                        multiple
                        size="small"
                        sx={{ minWidth: 200 }}
                        value={u.teamIds}
                        onChange={(e) =>
                          onChangeTeams(u.userId, e.target.value as string[])
                        }
                        renderValue={(selected) =>
                          (selected as string[]).length
                            ? (selected as string[]).map(teamName).join(', ')
                            : 'No teams'
                        }
                      >
                        {teams.map((t) => (
                          <MenuItem key={t.id} value={t.id}>
                            {t.name}
                          </MenuItem>
                        ))}
                      </Select>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </Box>
    </>
  );
}

UsersPage.getLayout = (page: PageLayout) => (
  <ExtendedSidebarLayout>{page}</ExtendedSidebarLayout>
);

export default UsersPage;
