import { Box, Button, Card, TextField, Typography } from '@mui/material';
import { signIn } from 'next-auth/react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { FormEvent, ReactElement, useState } from 'react';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    const res = await signIn('credentials', {
      email,
      password,
      redirect: false
    });

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
        <Card sx={{ p: 4, width: 380 }}>
          <Typography variant="h4" mb={3}>
            Sign in
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
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              margin="normal"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            {error && (
              <Typography color="error" mt={2} role="alert">
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
        </Card>
      </Box>
    </>
  );
}

Login.getLayout = (page: ReactElement) => page;
