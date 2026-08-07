import { Box, Button, Card, TextField, Typography } from '@mui/material';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { signIn } from 'next-auth/react';
import { FormEvent, ReactElement, useState } from 'react';

import { useAutofillSync } from '@/hooks/useAutofillSync';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const emailRef = useAutofillSync(email, setEmail);
  const passwordRef = useAutofillSync(password, setPassword);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    let res: Awaited<ReturnType<typeof signIn>>;
    try {
      res = await signIn('credentials', { email, password, redirect: false });
    } catch {
      setBusy(false);
      // CLUSTOX FIX: signIn() throwing (a network/server failure) used to be
      // indistinguishable from a bad password -- both fell through to the
      // same generic message. Kept the wording deliberately vague about
      // *why*, since we still don't want to reveal which case happened, but
      // this path no longer requires the request to have actually reached
      // the server and returned an { error }.
      setError('Something went wrong. Please try again.');
      return;
    }

    setBusy(false);

    if (res?.error) {
      // Deliberately does not distinguish unknown email from wrong password.
      setError('Invalid email or password');
      return;
    }
    router.replace('/');
  };

  return (
    <>
      <Head>
        <title>Sign in | MiddlewareHQ</title>
      </Head>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="center"
        minHeight="100vh"
      >
        <Card sx={{ p: 4.5, width: 380 }}>
          <Box display="flex" alignItems="center" gap={1.1} mb={3.5}>
            <Box
              sx={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                bgcolor: 'primary.main',
                boxShadow: (t) => `0 0 12px ${t.palette.primary.main}`
              }}
            />
            <Typography fontWeight={700} letterSpacing={-0.2}>
              Middleware
            </Typography>
          </Box>

          <Typography variant="h5" fontWeight={600} mb={0.5}>
            Sign in to your workspace
          </Typography>
          <Typography variant="body2" color="text.secondary" mb={3}>
            Use the account your Super Admin set up for you.
          </Typography>

          <form onSubmit={onSubmit}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              margin="normal"
              onChange={(e) => setEmail(e.target.value)}
              required
              inputRef={emailRef}
              // Deterministic fix for the autofill-overlap: keep the label
              // permanently shrunk instead of trying to detect the exact
              // moment the browser autofills, which is inherently racy
              // against React's own render timing.
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              margin="normal"
              onChange={(e) => setPassword(e.target.value)}
              required
              inputRef={passwordRef}
              InputLabelProps={{ shrink: true }}
            />
            {error && (
              <Typography color="error" mt={2} role="alert" variant="body2">
                {error}
              </Typography>
            )}
            <Button
              fullWidth
              type="submit"
              variant="contained"
              sx={{ mt: 3 }}
              disabled={busy}
            >
              {busy ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <Typography
            variant="caption"
            color="text.secondary"
            display="block"
            textAlign="center"
            mt={3.5}
            sx={{ letterSpacing: 0.4, fontFamily: 'monospace', fontSize: 10.5 }}
          >
            SELF-HOSTED · YOUR DATA STAYS ON YOUR INFRASTRUCTURE
          </Typography>
        </Card>
      </Box>
    </>
  );
}

Login.getLayout = (page: ReactElement) => page;
