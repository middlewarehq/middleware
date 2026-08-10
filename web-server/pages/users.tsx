import {
  AdminPanelSettingsTwoTone,
  LockTwoTone,
  MoreVertTwoTone,
  PersonAddAlt1TwoTone,
  WorkspacesTwoTone
} from '@mui/icons-material';
import {
  Alert,
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
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import Head from 'next/head';
import { useSnackbar } from 'notistack';
import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { FlexBox } from '@/components/FlexBox';
import { RoleChip } from '@/components/RoleChip';
import { Line } from '@/components/Text';
import { UserAvatar } from '@/components/UserAvatar';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useAutofillSync } from '@/hooks/useAutofillSync';
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

type InviteRow = {
  id: string;
  email: string;
  name: string;
  role: ClustoxRole;
  orgName: string | null;
  expired: boolean;
  emailed: boolean;
};

// CLUSTOX: users and pending invites rendered as one roster instead of a
// table plus a separate strip of chips above it -- an invite is just a
// person who hasn't finished signing up yet, not a different kind of thing.
type RosterRow =
  | { kind: 'user'; key: string; name: string; email: string; role: ClustoxRole; orgName: string | null; user: UserRow }
  | { kind: 'invite'; key: string; name: string; email: string; role: ClustoxRole; orgName: string | null; invite: InviteRow };

const NEW_WORKSPACE = '__new__';

const emptyForm = {
  name: '',
  email: '',
  role: 'ADMIN' as ClustoxRole,
  // NEW_WORKSPACE provisions a fresh one; otherwise adopt an existing
  // workspace that has no owner.
  org_id: NEW_WORKSPACE
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

const StatusChip = ({ status }: { status: 'active' | 'invited' | 'expired' }) => (
  <Chip
    size="small"
    label={
      status === 'active' ? 'Active' : status === 'expired' ? 'Expired' : 'Invited'
    }
    color={status === 'active' ? 'success' : status === 'expired' ? 'error' : 'warning'}
    variant="outlined"
    sx={{ fontWeight: 600 }}
  />
);

const ROLE_OPTIONS: {
  value: ClustoxRole;
  label: string;
  description: string;
  icon: typeof WorkspacesTwoTone;
}[] = [
  {
    value: 'ADMIN',
    label: 'Admin',
    description:
      'Gets their own workspace, connects their own GitHub or GitLab, and sees only their own projects.',
    icon: WorkspacesTwoTone
  },
  {
    value: 'SUPERADMIN',
    label: 'Superadmin',
    description:
      'Sees every workspace, manages users and roles, and owns no workspace of their own.',
    icon: AdminPanelSettingsTwoTone
  }
];

/** Role picker as description cards, not a plain toggle-button pair. */
const RolePicker = ({
  value,
  onChange
}: {
  value: ClustoxRole;
  onChange: (role: ClustoxRole) => void;
}) => {
  const theme = useTheme();

  return (
    <FlexBox gap={1.5}>
      {ROLE_OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const selected = value === opt.value;
        return (
          <FlexBox
            key={opt.value}
            col
            gap={0.75}
            p={1.75}
            flex={1}
            corner="10px"
            onClick={() => onChange(opt.value)}
            sx={{
              cursor: 'pointer',
              border: '1.5px solid',
              borderColor: selected
                ? theme.colors.primary.main
                : theme.colors.alpha.trueWhite[30],
              background: selected
                ? theme.colors.alpha.black[10]
                : 'transparent',
              transition: 'border-color 0.15s'
            }}
          >
            <FlexBox alignCenter gap={1}>
              <Icon fontSize="small" color={selected ? 'primary' : 'inherit'} />
              <Line medium bold>
                {opt.label}
              </Line>
            </FlexBox>
            <Line small secondary>
              {opt.description}
            </Line>
          </FlexBox>
        );
      })}
    </FlexBox>
  );
};

function UsersPage() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();

  const [users, setUsers] = useState<UserRow[]>([]);
  const [workspaces, setWorkspaces] = useState<
    { id: string; name: string; owned: boolean }[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [forbidden, setForbidden] = useState(false);

  const [form, setForm] = useState(emptyForm);
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState('');
  const [inviteEmailed, setInviteEmailed] = useState(false);
  const [invites, setInvites] = useState<InviteRow[]>([]);

  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [menuRow, setMenuRow] = useState<RosterRow | null>(null);

  const nameRef = useAutofillSync(form.name, (name) =>
    setForm((f) => ({ ...f, name }))
  );
  const emailRef = useAutofillSync(form.email, (email) =>
    setForm((f) => ({ ...f, email }))
  );

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

  const roster: RosterRow[] = useMemo(
    () => [
      ...users.map((u): RosterRow => ({
        kind: 'user',
        key: u.userId,
        name: u.name,
        email: u.email,
        role: u.role,
        orgName: u.orgName,
        user: u
      })),
      ...invites.map((i): RosterRow => ({
        kind: 'invite',
        key: i.id,
        name: i.name,
        email: i.email,
        role: i.role,
        orgName: i.orgName,
        invite: i
      }))
    ],
    [users, invites]
  );

  const counts = useMemo(
    () => ({
      total: users.length,
      admins: users.filter((u) => u.role === 'ADMIN').length,
      workspaces: new Set(users.map((u) => u.orgId).filter(Boolean)).size,
      pending: invites.length
    }),
    [users, invites]
  );

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

    const { invite_url, emailed } = await res.json();
    // Shown once and only once: only the hash is stored, so a lost link
    // cannot be recovered and has to be reissued.
    setInviteLink(invite_url);
    setInviteEmailed(emailed);
    await loadInvites();
  };

  const revokeInvite = async (id: string) => {
    setMenuAnchor(null);
    await fetch(`/api/clustox/invites/${id}`, { method: 'DELETE' });
    await loadInvites();
    enqueueSnackbar('Invitation revoked', { variant: 'success' });
  };

  const resendInvite = async (invite: InviteRow) => {
    setMenuAnchor(null);
    // No dedicated resend endpoint -- revoke the old one and issue a fresh
    // link with the same details, which is exactly what "resend" means
    // given only a hash of the link is ever stored server-side.
    await fetch(`/api/clustox/invites/${invite.id}`, { method: 'DELETE' });
    const res = await fetch('/api/clustox/invites', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: invite.name,
        email: invite.email,
        role: invite.role
      })
    });
    await loadInvites();
    if (!res.ok) {
      enqueueSnackbar('Could not resend the invitation.', { variant: 'error' });
      return;
    }
    const { emailed } = await res.json();
    enqueueSnackbar(
      emailed ? `Invite resent to ${invite.email}` : `New invite link created for ${invite.email}, but it couldn't be emailed`,
      { variant: emailed ? 'success' : 'warning' }
    );
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
      <FlexBox col alignCenter justifyCenter gap={1.75} py={8} px={4}>
        <FlexBox
          alignCenter
          justifyCenter
          width={52}
          height={52}
          corner="50%"
          sx={{ background: theme.colors.alpha.trueWhite[10] }}
        >
          <LockTwoTone sx={{ color: theme.colors.alpha.trueWhite[70] }} />
        </FlexBox>
        <Line bigish bold>
          You don&apos;t have access to this page
        </Line>
        <Line
          secondary
          textAlign="center"
          sx={{ maxWidth: 360 }}
        >
          Only Superadmins can manage users and roles. Ask your Superadmin if
          someone needs to be added or removed.
        </Line>
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
          <FlexBox col>
            <Line bigish bold>
              {counts.total} {counts.total === 1 ? 'user' : 'users'}
            </Line>
            <Line small secondary>
              {counts.admins} admin{counts.admins === 1 ? '' : 's'} across{' '}
              {counts.workspaces} workspace{counts.workspaces === 1 ? '' : 's'}
              {counts.pending > 0 &&
                ` · ${counts.pending} pending invite${counts.pending === 1 ? '' : 's'}`}
            </Line>
          </FlexBox>

          <Button
            variant="contained"
            startIcon={<PersonAddAlt1TwoTone />}
            onClick={() => {
              setForm(emptyForm);
              setFormError('');
              setInviteLink('');
              setInviteEmailed(false);
              setInviteOpen(true);
            }}
          >
            Invite user
          </Button>
        </FlexBox>

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
                <TableCell width={140}>Role</TableCell>
                <TableCell width={120}>Status</TableCell>
                <TableCell width={260}>Workspace</TableCell>
                <TableCell width={64} align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {roster.map((row) => (
                <TableRow key={row.key} hover>
                  <TableCell>
                    <FlexBox alignCenter gap={1.5}>
                      <UserAvatar name={row.name} email={row.email} />
                      <FlexBox col>
                        <Line medium>{row.name}</Line>
                        <Line small secondary>
                          <Mono>{row.email}</Mono>
                        </Line>
                      </FlexBox>
                    </FlexBox>
                  </TableCell>

                  <TableCell>
                    <RoleChip role={row.role} />
                  </TableCell>

                  <TableCell>
                    <StatusChip
                      status={
                        row.kind === 'user'
                          ? 'active'
                          : row.invite.expired
                            ? 'expired'
                            : 'invited'
                      }
                    />
                  </TableCell>

                  <TableCell>
                    {row.role === 'SUPERADMIN' ? (
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
                        <Mono>{row.orgName ?? '—'}</Mono>
                      </FlexBox>
                    )}
                  </TableCell>

                  <TableCell align="right">
                    <IconButton
                      size="small"
                      onClick={(e) => {
                        setMenuRow(row);
                        setMenuAnchor(e.currentTarget);
                      }}
                    >
                      <MoreVertTwoTone fontSize="small" />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}

              {roster.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5}>
                    <FlexBox col alignCenter gap={1} py={5}>
                      <Line secondary>No users yet.</Line>
                      <Line small secondary>
                        Invite an admin to create their first workspace.
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
        {menuRow?.kind === 'user' &&
          (menuRow.user.role === 'ADMIN' ? (
            <MenuItem onClick={() => changeRole(menuRow.user, 'SUPERADMIN')}>
              <ListItemIcon>
                <AdminPanelSettingsTwoTone fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Promote to superadmin"
                secondary="Sees every workspace"
              />
            </MenuItem>
          ) : (
            <MenuItem onClick={() => changeRole(menuRow.user, 'ADMIN')}>
              <ListItemIcon>
                <WorkspacesTwoTone fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary="Demote to admin"
                secondary="Scoped to one workspace"
              />
            </MenuItem>
          ))}

        {menuRow?.kind === 'invite' && [
          <MenuItem key="resend" onClick={() => resendInvite(menuRow.invite)}>
            <ListItemIcon>
              <PersonAddAlt1TwoTone fontSize="small" />
            </ListItemIcon>
            <ListItemText primary="Resend invite" />
          </MenuItem>,
          <MenuItem
            key="revoke"
            onClick={() => revokeInvite(menuRow.invite.id)}
            sx={{ color: 'error.main' }}
          >
            <ListItemIcon>
              <LockTwoTone fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary="Revoke invite" />
          </MenuItem>
        ]}
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
                {inviteEmailed ? (
                  <Alert severity="success">
                    Emailed. The link is also below in case it needs to be
                    forwarded — only its fingerprint is stored, so it cannot be
                    shown again if lost.
                  </Alert>
                ) : (
                  <Alert severity="warning">
                    Couldn&apos;t email this one (SMTP isn&apos;t set up, or the
                    send failed) — copy the link below and send it yourself.
                    Only its fingerprint is stored, so it cannot be shown again
                    if lost.
                  </Alert>
                )}
                <TextField
                  fullWidth
                  multiline
                  value={inviteLink}
                  InputProps={{ readOnly: true }}
                  onFocus={(e) => e.target.select()}
                />
                <Line small secondary>
                  Single use, expires in 7 days. The recipient chooses their own
                  password.
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
            <DialogTitle>Invite a teammate</DialogTitle>
            <Divider />
            <DialogContent>
              <FlexBox col gap={2.5} pt={1}>
                <TextField
                  label="Email address"
                  type="email"
                  value={form.email}
                  required
                  autoFocus
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  inputRef={emailRef}
                  InputLabelProps={{ shrink: true }}
                />
                <TextField
                  label="Full name"
                  value={form.name}
                  required
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  inputRef={nameRef}
                  InputLabelProps={{ shrink: true }}
                />

                <FlexBox col gap={0.75}>
                  <Line small secondary>
                    Role
                  </Line>
                  <RolePicker
                    value={form.role}
                    onChange={(role) => setForm({ ...form, role })}
                  />
                </FlexBox>

                {form.role === 'ADMIN' && (
                  <TextField
                    select
                    label="Workspace"
                    value={form.org_id}
                    onChange={(e) => setForm({ ...form, org_id: e.target.value })}
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
                {busy ? 'Sending…' : 'Send invite'}
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
    </>
  );
}

UsersPage.getLayout = (page: PageLayout) => (
  <ExtendedSidebarLayout>
    <PageWrapper
      title={
        <FlexBox gap1 alignCenter>
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
