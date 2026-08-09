import {
  AdminPanelSettingsTwoTone,
  WorkspacesTwoTone
} from '@mui/icons-material';
import {
  Alert,
  Box,
  Button,
  Card,
  CircularProgress,
  Divider,
  TextField,
  Typography
} from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import { FormEvent, ReactElement, useCallback, useEffect, useState } from 'react';

import { FlexBox } from '@/components/FlexBox';

const MIN_PASSWORD = 12;

type Preview = {
  email: string;
  name: string;
  role: 'SUPERADMIN' | 'ADMIN';
  orgName: string | null;
};

export default function AcceptInvite() {
  const router = useRouter();
  const token = (router.query.token as string) || '';

  const [preview, setPreview] = useState<Preview | null>(null);
  const [loading, setLoading] = useState(true);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!router.isReady) return;
    if (!token) {
      setLoading(false);
      return;
    }

    const res = await fetch(
      `/api/clustox/accept-invite?token=${encodeURIComponent(token)}`
    );
    if (res.ok) setPreview(await res.json());
    setLoading(false);
  }, [router.isReady, token]);

  useEffect(() => {
    load();
  }, [load]);

  const tooShort = password.length > 0 && password.length < MIN_PASSWORD;
  const mismatch = confirm.length > 0 && confirm !== password;

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    const res = await fetch('/api/clustox/accept-invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password })
    });

    if (!res.ok) {
      setBusy(false);
      setError(
        res.status === 409
          ? 'An account with this email already exists. Try signing in instead.'
          : 'This invitation is no longer valid. Ask for a new link.'
      );
      return;
    }

    // Sign them straight in: making someone re-enter the password they just
    // chose is a pointless extra step.
    const signInRes = await signIn('credentials', {
      email: preview?.email,
      password,
      redirect: false
    });

    setBusy(false);

    if (signInRes?.error) {
      router.replace('/login');
      return;
    }
    // CLUSTOX FIX: same AuthProvider one-shot-session issue as login.tsx --
    // router.replace() is a client-side nav that leaves AuthProvider on its
    // pre-sign-in (unauthenticated, no org) snapshot. Full navigation forces
    // a remount so it fetches session fresh, now with the auth cookie set.
    window.location.assign('/');
  };

  if (loading)
    return (
      <FlexBox minHeight="100vh" alignCenter justifyCenter>
        <CircularProgress />
      </FlexBox>
    );

  if (!preview)
    return (
      <FlexBox minHeight="100vh" alignCenter justifyCenter>
        <Card sx={{ p: 4, maxWidth: 460 }}>
          <Typography variant="h4" mb={2}>
            This invitation is not valid
          </Typography>
          <Typography color="text.secondary" mb={3}>
            The link may have been used already, revoked, or expired.
            Invitations last {7} days. Ask whoever invited you for a new one.
          </Typography>
          <Button variant="outlined" onClick={() => router.replace('/login')}>
            Go to sign in
          </Button>
        </Card>
      </FlexBox>
    );

  return (
    <>
      <Head>
        <title>Accept invitation | MiddlewareHQ</title>
      </Head>
      <FlexBox minHeight="100vh" alignCenter justifyCenter>
        <Card sx={{ p: 4, width: 460 }}>
          <Typography variant="h4">Welcome, {preview.name}</Typography>
          <Typography color="text.secondary" mt={1}>
            Choose a password to finish setting up your account.
          </Typography>

          <Box mt={3} mb={3}>
            <Alert
              severity="info"
              icon={
                preview.role === 'ADMIN' ? (
                  <WorkspacesTwoTone fontSize="inherit" />
                ) : (
                  <AdminPanelSettingsTwoTone fontSize="inherit" />
                )
              }
            >
              {preview.role === 'ADMIN'
                ? preview.orgName
                  ? `You will manage the “${preview.orgName}” workspace.`
                  : 'You will get your own workspace, where you connect your GitHub or GitLab account and add your projects.'
                : 'You will be a superadmin, able to see every workspace and manage users.'}
            </Alert>
          </Box>

          <Divider />

          <form onSubmit={onSubmit}>
            <TextField
              fullWidth
              label="Email"
              value={preview.email}
              margin="normal"
              disabled
              helperText="Set by whoever invited you"
            />
            <TextField
              fullWidth
              label="Choose a password"
              type="password"
              value={password}
              margin="normal"
              required
              autoFocus
              error={tooShort}
              onChange={(e) => setPassword(e.target.value)}
              helperText={
                tooShort
                  ? `${MIN_PASSWORD - password.length} more characters needed`
                  : `At least ${MIN_PASSWORD} characters`
              }
              // A "create account" password field is exactly the kind
              // browsers offer to generate/autofill a password into.
              // Keeping the label permanently shrunk removes any race
              // between that and React learning the value.
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Confirm password"
              type="password"
              value={confirm}
              margin="normal"
              required
              error={mismatch}
              onChange={(e) => setConfirm(e.target.value)}
              helperText={mismatch ? 'Passwords do not match' : ' '}
              InputLabelProps={{ shrink: true }}
            />

            {error && (
              <Alert severity="error" role="alert" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}

            <Button
              fullWidth
              type="submit"
              variant="contained"
              sx={{ mt: 2 }}
              disabled={busy || tooShort || mismatch || !password || !confirm}
            >
              {busy ? 'Setting up…' : 'Create my account'}
            </Button>
          </form>
        </Card>
      </FlexBox>
    </>
  );
}

AcceptInvite.getLayout = (page: ReactElement) => page;
