import {
  AdminPanelSettingsTwoTone,
  LinkTwoTone,
  MoreVertTwoTone,
  PersonAddAlt1TwoTone,
  WorkspacesTwoTone
} from '@mui/icons-material';
import {
  Alert,
  Avatar,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import Head from 'next/head';
import { useSnackbar } from 'notistack';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { PageLayout } from '@/types/resources';

type ClustoxRole = 'SUPERADMIN' | 'ADMIN';

type UserRow = {
  userId: string;
  email: string;
  name: string;
  role: ClustoxRole;
  orgId: string | null;
  orgName: string | null;
};

const MIN_PASSWORD = 12;

const NEW_WORKSPACE = '__new__';

const emptyForm = {
  name: '',
  email: '',
  password: '',
  role: 'ADMIN' as ClustoxRole,
  // NEW_WORKSPACE provisions a fresh one; otherwise adopt an existing
  // workspace that has no owner.
  org_id: NEW_WORKSPACE
};

const initials = (name: string, email: string) => {
  const source = name?.trim() || email;
  const parts = source.split(/[\s.@]+/).filter(Boolean);
  return (parts[0]?.[0] ?? '?').concat(parts[1]?.[0] ?? '').toUpperCase();
};

/** Identifiers read as data, not prose. */
const Mono = ({ children }: { children: React.ReactNode }) => (
  <Typography
    component="span"
    sx={{
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '0.8125rem',
      letterSpacing: '-0.01em'
    }}
  >
    {children}
  </Typography>
);

const RoleChip = ({ role }: { role: ClustoxRole }) => (
  <Chip
    size="small"
    label={role === 'SUPERADMIN' ? 'Superadmin' : 'Admin'}
    color={role === 'SUPERADMIN' ? 'primary' : 'default'}
    variant={role === 'SUPERADMIN' ? 'filled' : 'outlined'}
    sx={{ fontWeight: 600, letterSpacing: '0.02em' }}
  />
);

function UsersPage() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [workspaces, setWorkspaces] = useState<
    { id: string; name: string; owned: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [invites, setInvites] = useState<
    { id: string; email: string; name: string; role: ClustoxRole; orgName: string | null; expired: boolean }[]
  >([]);

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuUser, setMenuUser] = useState<UserRow | null>(null);

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

  const loadWorkspaces = useCallback(async () => {
    const res = await fetch('/api/clustox/workspaces');
    if (res.ok) setWorkspaces(await res.json());
  }, []);

  const loadInvites = useCallback(async () => {
    const res = await fetch('/api/clustox/invites');
    if (res.ok) setInvites(await res.json());
  }, []);

  useEffect(() => {
    loadUsers();
    loadWorkspaces();
    loadInvites();
  }, [loadUsers, loadWorkspaces, loadInvites]);

  const counts = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === 'ADMIN').length,
      workspaces: new Set(users.map((u) => u.orgId).filter(Boolean)).size
    }),
    [users]
  );

  const passwordTooShort =
    form.password.length > 0 && form.password.length < MIN_PASSWORD;

  const onCreate = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');

    const res = await fetch('/api/clustox/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...form,
        team_ids: [],
        org_id: form.org_id === NEW_WORKSPACE ? null : form.org_id
      })
    });

    setBusy(false);

    if (!res.ok) {
      setFormError(
        res.status === 409
          ? 'A user with that email already exists.'
          : `Could not create user. Password must be at least ${MIN_PASSWORD} characters.`
      );
      return;
    }

    const created = await res.json();
    setDialogOpen(false);
    setForm(emptyForm);
    await Promise.all([loadUsers(), loadWorkspaces()]);

    const adopted = workspaces.find((w) => w.id === form.org_id);
    enqueueSnackbar(
      form.role !== 'ADMIN'
        ? `${form.name} added as a superadmin`
        : adopted
          ? `${form.name} now owns the “${adopted.name}” workspace`
          : `${form.name} added — a new workspace was created for them`,
      { variant: 'success', autoHideDuration: 5000 }
    );
    return created;
  };

  const createInvite = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setFormError('');

    const res = await fetch('/api/clustox/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        role: form.role,
        org_id: form.org_id === NEW_WORKSPACE ? null : form.org_id
      })
    });

    setBusy(false);

    if (!res.ok) {
      setFormError(
        res.status === 409
          ? 'A user with that email already exists.'
          : 'Could not create the invitation.'
      );
      return;
    }

    const { invite_url } = await res.json();
    // Shown once and only once: only the hash is stored, so a lost link
    // cannot be recovered and has to be reissued.
    setInviteLink(invite_url);
    await loadInvites();
  };

  const revokeInvite = async (id: string) => {
    await fetch(`/api/clustox/invites/${id}`, { method: 'DELETE' });
    await loadInvites();
    enqueueSnackbar('Invitation revoked', { variant: 'success' });
  };

  const changeRole = async (user: UserRow, role: ClustoxRole) => {
    setMenuAnchor(null);
    const res = await fetch(`/api/clustox/users/${user.userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role })
    });

    if (!res.ok) {
      enqueueSnackbar(
        res.status === 409
          ? 'You cannot demote the last superadmin.'
          : 'Could not change role.',
        { variant: 'error' }
      );
      return;
    }

    await loadUsers();
    enqueueSnackbar(`${user.name} is now ${role.toLowerCase()}`, {
      variant: 'success'
    });
  };

  if (loading)
    return (
      <FlexBox p={6} justifyCenter>
        <CircularProgress />
      </FlexBox>
    );

  if (forbidden)
    return (
      <FlexBox p={4} col gap={2} maxWidth="640px">
        <Alert severity="warning">
          Only superadmins can manage users. If you need access, ask a
          superadmin to change your role.
        </Alert>
      </FlexBox>
    );

  return (
    <>
      <Head>
        <title>Users | MiddlewareHQ</title>
      </Head>

      <FlexBox col gap={3} maxWidth="1100px">
        {/* Summary + primary action */}
        <FlexBox justifyBetween alignCenter flexWrap="wrap" gap={2}>
          <FlexBox gap={3} alignCenter>
            <FlexBox col>
              <Line bigish bold>
                {counts.total} {counts.total === 1 ? 'user' : 'users'}
              </Line>
              <Line small secondary>
                {counts.admins} admin{counts.admins === 1 ? '' : 's'} across{' '}
                {counts.workspaces} workspace
                {counts.workspaces === 1 ? '' : 's'}
              </Line>
            </FlexBox>
          </FlexBox>

          <FlexBox gap={1.5}>
            <Button
              variant="outlined"
              startIcon={<LinkTwoTone />}
              onClick={() => {
                setForm(emptyForm);
                setFormError('');
                setInviteLink('');
                setInviteOpen(true);
              }}
            >
              Invite
            </Button>
            <Button
              variant="contained"
              startIcon={<PersonAddAlt1TwoTone />}
              onClick={() => {
                setForm(emptyForm);
                setFormError('');
                setDialogOpen(true);
              }}
            >
              Add user
            </Button>
          </FlexBox>
        </FlexBox>

        {invites.length > 0 && (
          <FlexBox col gap={1}>
            <Line small secondary>
              Pending invitations
            </Line>
            <FlexBox gap={1} flexWrap="wrap">
              {invites.map((i) => (
                <Chip
                  key={i.id}
                  size="small"
                  variant="outlined"
                  color={i.expired ? 'error' : 'default'}
                  onDelete={() => revokeInvite(i.id)}
                  label={`${i.email} · ${i.role === 'ADMIN' ? 'admin' : 'superadmin'}${
                    i.expired ? ' · expired' : ''
                  }`}
                />
              ))}
            </FlexBox>
          </FlexBox>
        )}

        {/* Roster */}
        <TableContainer
          sx={{
            border: `1px solid ${theme.colors.alpha.trueWhite[10]}`,
            borderRadius: 1.5,
            overflow: 'hidden'
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>User</TableCell>
                <TableCell width={160}>Role</TableCell>
                <TableCell width={280}>Workspace</TableCell>
                <TableCell width={64} align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.userId} hover>
                  <TableCell>
                    <FlexBox alignCenter gap={1.5}>
                      <Avatar
                        sx={{
                          width: 34,
                          height: 34,
                          fontSize: '0.8rem',
                          fontWeight: 700,
                          bgcolor:
                            u.role === 'SUPERADMIN'
                              ? theme.colors.primary.main
                              : theme.colors.alpha.trueWhite[10]
                        }}
                      >
                        {initials(u.name, u.email)}
                      </Avatar>
                      <FlexBox col>
                        <Line medium>{u.name}</Line>
                        <Line small secondary>
                          <Mono>{u.email}</Mono>
                        </Line>
                      </FlexBox>
                    </FlexBox>
                  </TableCell>

                  <TableCell>
                    <RoleChip role={u.role} />
                  </TableCell>

                  <TableCell>
                    {u.role === 'SUPERADMIN' ? (
                      <Tooltip title="Superadmins are not scoped to a workspace and can view every one">
                        <FlexBox alignCenter gap={0.75}>
                          <AdminPanelSettingsTwoTone
                            fontSize="small"
                            sx={{ color: theme.colors.primary.main }}
                          />
                          <Line small secondary>
                            All workspaces
                          </Line>
                        </FlexBox>
                      </Tooltip>
                    ) : (
                      <FlexBox alignCenter gap={0.75}>
                        <WorkspacesTwoTone
                          fontSize="small"
                          sx={{ color: theme.colors.alpha.trueWhite[50] }}
                        />
                        <Mono>{u.orgName ?? '—'}</Mono>
                      </FlexBox>
                    )}
                  </TableCell>

                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setMenuUser(u);
                        setMenuAnchor(e.currentTarget);
                      }}
                    >
                      <MoreVertTwoTone fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <FlexBox col alignCenter gap={1} py={5}>
                      <Line secondary>No users yet.</Line>
                      <Line small secondary>
                        Add an admin to create their first workspace.
                      </Line>
                    </FlexBox>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </FlexBox>

      {/* Row actions */}
      <Menu
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={() => setMenuAnchor(null)}
      >
        {menuUser?.role === 'ADMIN' ? (
          <MenuItem onClick={() => changeRole(menuUser, 'SUPERADMIN')}>
            <ListItemIcon>
              <AdminPanelSettingsTwoTone fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Promote to superadmin"
              secondary="Sees every workspace"
            />
          </MenuItem>
        ) : (
          <MenuItem onClick={() => menuUser && changeRole(menuUser, 'ADMIN')}>
            <ListItemIcon>
              <WorkspacesTwoTone fontSize="small" />
            </ListItemIcon>
            <ListItemText
              primary="Demote to admin"
              secondary="Scoped to one workspace"
            />
          </MenuItem>
        )}
      </Menu>

      {/* Invite */}
      <Dialog
        open={inviteOpen}
        onClose={() => !busy && setInviteOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        {inviteLink ? (
          <>
            <DialogTitle>Invitation ready</DialogTitle>
            <Divider />
            <DialogContent>
              <FlexBox col gap={2} pt={1}>
                <Alert severity="warning">
                  Copy this link now. Only its fingerprint is stored, so it
                  cannot be shown again — if it is lost you will have to issue a
                  new one.
                </Alert>
                <TextField
                  fullWidth
                  multiline
                  value={inviteLink}
                  InputProps={{ readOnly: true }}
                  onFocus={(e) => e.target.select()}
                />
                <Line small secondary>
                  Single use, expires in 7 days. Send it over Slack — the
                  recipient chooses their own password.
                </Line>
              </FlexBox>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button
                onClick={() => {
                  navigator.clipboard?.writeText(inviteLink);
                  enqueueSnackbar('Link copied', { variant: 'success' });
                }}
              >
                Copy link
              </Button>
              <Button variant="contained" onClick={() => setInviteOpen(false)}>
                Done
              </Button>
            </DialogActions>
          </>
        ) : (
          <form onSubmit={createInvite}>
            <DialogTitle>Invite someone</DialogTitle>
            <Divider />
            <DialogContent>
              <FlexBox col gap={2.5} pt={1}>
                <ToggleButtonGroup
                  exclusive
                  fullWidth
                  size="small"
                  value={form.role}
                  onChange={(_e, v) => v && setForm({ ...form, role: v })}
                >
                  <ToggleButton value="ADMIN">Admin</ToggleButton>
                  <ToggleButton value="SUPERADMIN">Superadmin</ToggleButton>
                </ToggleButtonGroup>

                <Alert severity="info">
                  They set their own password, so you never have to choose or
                  send one.
                </Alert>

                <TextField
                  label="Full name"
                  value={form.name}
                  required
                  autoFocus
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
                <TextField
                  label="Email"
                  type="email"
                  value={form.email}
                  required
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />

                {form.role === 'ADMIN' && (
                  <TextField
                    select
                    label="Workspace"
                    value={form.org_id}
                    onChange={(e) =>
                      setForm({ ...form, org_id: e.target.value })
                    }
                  >
                    <MenuItem value={NEW_WORKSPACE}>
                      Create a new workspace
                    </MenuItem>
                    {workspaces
                      .filter((w) => !w.owned)
                      .map((w) => (
                        <MenuItem key={w.id} value={w.id}>
                          Adopt “{w.name}” (currently unowned)
                        </MenuItem>
                      ))}
                  </TextField>
                )}

                {formError && (
                  <Alert severity="error" role="alert">
                    {formError}
                  </Alert>
                )}
              </FlexBox>
            </DialogContent>
            <Divider />
            <DialogActions sx={{ px: 3, py: 2 }}>
              <Button onClick={() => setInviteOpen(false)} disabled={busy}>
                Cancel
              </Button>
              <Button type="submit" variant="contained" disabled={busy}>
                {busy ? 'Creating…' : 'Create link'}
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>

      {/* Add user */}
      <Dialog
        open={dialogOpen}
        onClose={() => !busy && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <form onSubmit={onCreate}>
          <DialogTitle>Add a user</DialogTitle>
          <Divider />
          <DialogContent>
            <FlexBox col gap={2.5} pt={1}>
              <ToggleButtonGroup
                exclusive
                fullWidth
                size="small"
                value={form.role}
                onChange={(_e, v) => v && setForm({ ...form, role: v })}
              >
                <ToggleButton value="ADMIN">Admin</ToggleButton>
                <ToggleButton value="SUPERADMIN">Superadmin</ToggleButton>
              </ToggleButtonGroup>

              <Alert
                severity="info"
                icon={
                  form.role === 'ADMIN' ? (
                    <WorkspacesTwoTone fontSize="inherit" />
                  ) : (
                    <AdminPanelSettingsTwoTone fontSize="inherit" />
                  )
                }
              >
                {form.role === 'ADMIN'
                  ? 'Gets their own workspace, connects their own GitHub or GitLab, and sees only their own projects.'
                  : 'Sees every workspace, manages users, and owns no workspace of their own.'}
              </Alert>

              <TextField
                label="Full name"
                value={form.name}
                required
                autoFocus
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                helperText={
                  form.role === 'ADMIN' && form.org_id === NEW_WORKSPACE
                    ? 'Also names their workspace'
                    : undefined
                }
              />

              {form.role === 'ADMIN' && (
                <TextField
                  select
                  label="Workspace"
                  value={form.org_id}
                  onChange={(e) =>
                    setForm({ ...form, org_id: e.target.value })
                  }
                  helperText={
                    form.org_id === NEW_WORKSPACE
                      ? 'A new workspace is created and named after them'
                      : 'They take ownership of this existing workspace, keeping its integration and repositories'
                  }
                >
                  <MenuItem value={NEW_WORKSPACE}>
                    Create a new workspace
                  </MenuItem>
                  {workspaces
                    .filter((w) => !w.owned)
                    .map((w) => (
                      <MenuItem key={w.id} value={w.id}>
                        Adopt “{w.name}” (currently unowned)
                      </MenuItem>
                    ))}
                </TextField>
              )}
              <TextField
                label="Email"
                type="email"
                value={form.email}
                required
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <TextField
                label="Temporary password"
                type="password"
                value={form.password}
                required
                error={passwordTooShort}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                helperText={
                  passwordTooShort
                    ? `${MIN_PASSWORD - form.password.length} more characters needed`
                    : `At least ${MIN_PASSWORD} characters. Share it with them directly.`
                }
              />

              {formError && (
                <Alert severity="error" role="alert">
                  {formError}
                </Alert>
              )}
            </FlexBox>
          </DialogContent>
          <Divider />
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button onClick={() => setDialogOpen(false)} disabled={busy}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="contained"
              disabled={busy || passwordTooShort}
            >
              {busy ? 'Adding…' : 'Add user'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  );
}

UsersPage.getLayout = (page: PageLayout) => (
  <ExtendedSidebarLayout>
    <PageWrapper
      title={
        <FlexBox gap={1} alignCenter>
          <AdminPanelSettingsTwoTone />
          Users
        </FlexBox>
      }
      pageTitle="Users"
      hideAllSelectors
      showEvenIfNoTeamSelected
      showDate={false}
    >
      {page}
    </PageWrapper>
  </ExtendedSidebarLayout>
);

export default UsersPage;
