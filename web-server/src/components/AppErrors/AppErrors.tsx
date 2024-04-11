import { LoadingButton } from '@mui/lab';
import {
  Dialog,
  DialogTitle,
  Typography,
  DialogContent,
  Button
} from '@mui/material';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { FC, useMemo } from 'react';

import { InternalAPIErrors } from '@/constants/error';
import { Integration } from '@/constants/integrations';
import { ROUTES } from '@/constants/routes';
import { useAuth } from '@/hooks/useAuth';
import { useAxios } from '@/hooks/useAxios';
import { appSlice } from '@/slices/app';
import { useDispatch, useSelector } from '@/store';

import Disconnected from './disconnected.svg';

const Subtitle: typeof Typography = (props: any) => (
  <Typography
    {...props}
    variant="subtitle1"
    fontSize="0.8em"
    maxWidth={300}
    margin="auto"
    mt={2}
  />
);

const providerNameMap: Partial<Record<Integration, string>> = {
  [Integration.GOOGLE]: 'Google Calendar',
  [Integration.GITHUB]: 'GitHub',
  [Integration.JIRA]: 'Jira',
  [Integration.BITBUCKET]: 'Bitbucket'
};

const UnlinkProvider: FC<{ provider: Integration }> = ({ provider }) => {
  const { orgId } = useAuth();
  const [, { fetch, loading }] = useAxios(
    {
      url: '/integrations',
      method: 'DELETE',
      params: { org_id: orgId, provider }
    },
    { manual: true }
  );
  return (
    <>
      <Typography maxWidth={450}>
        Middleware's access to {providerNameMap[provider]} was likely revoked by
        the person who authorized the access
      </Typography>
      <LoadingButton
        loading={loading}
        variant="outlined"
        sx={{ mt: 3 }}
        onClick={() => fetch().then(() => signIn(provider))}
      >
        Fix it
      </LoadingButton>
      <Subtitle>
        Clicking "Fix it" will authorize Middleware to use your account to link{' '}
        {providerNameMap[provider]} for your organization
      </Subtitle>
      <Subtitle>You'll automatically be taken to the consent screen</Subtitle>
    </>
  );
};

const BadCredentials: FC = () => {
  const dispatch = useDispatch();

  return (
    <>
      <Typography maxWidth={450}>
        Somehow the access credentials that we stored for your org has gone bad.
      </Typography>
      <Link href={ROUTES.INTEGRATIONS.PATH} passHref>
        <Button
          variant="outlined"
          sx={{ mt: 3 }}
          onClick={() => dispatch(appSlice.actions.setErrors({}))}
        >
          Re-link accounts
        </Button>
      </Link>
      <Subtitle>
        Clicking "Re-link accounts" will take you to the integrations page
      </Subtitle>
      <Subtitle>
        There, you should try to unlink, and the link your app integrations
        again
      </Subtitle>
    </>
  );
};

const errorMap = {
  [InternalAPIErrors.GOOGLE_TOKEN_NOT_FOUND]: {
    title: 'Google Calendar Access Unavailable',
    body: <UnlinkProvider provider={Integration.GOOGLE} />
  },
  [InternalAPIErrors.GITHUB_TOKEN_NOT_FOUND]: {
    title: 'Github Access Unavailable',
    body: <UnlinkProvider provider={Integration.GITHUB} />
  },
  [InternalAPIErrors.JIRA_TOKEN_NOT_FOUND]: {
    title: 'Jira Access Unavailable',
    body: <UnlinkProvider provider={Integration.JIRA} />
  },
  [InternalAPIErrors.GOOGLE_TOKEN_EXPIRED]: {
    title: 'Google Calendar Access Expired',
    body: <UnlinkProvider provider={Integration.GOOGLE} />
  },
  [InternalAPIErrors.GITHUB_TOKEN_EXPIRED]: {
    title: 'Github Access Expired',
    body: <UnlinkProvider provider={Integration.GITHUB} />
  },
  [InternalAPIErrors.JIRA_TOKEN_EXPIRED]: {
    title: 'Jira Access Expired',
    body: <UnlinkProvider provider={Integration.JIRA} />
  },
  [InternalAPIErrors['Bad credentials']]: {
    title: 'Access tokens incorrect',
    body: <BadCredentials />
  }
} as const;

const useErrorFromState = () => {
  const errors = useSelector((state) => state.app.errors);

  return useMemo(() => {
    const keys = Object.keys(errors || {});
    const key = keys.find((key) =>
      Boolean(errorMap[key as keyof typeof errorMap])
    );
    return errorMap[key as keyof typeof errorMap];
  }, [errors]);
};

export const AppErrors = () => {
  const error = useErrorFromState();
  const dispatch = useDispatch();

  if (!error) return null;

  return (
    <Dialog
      open={true}
      onClose={() => dispatch(appSlice.actions.setErrors({}))}
    >
      <Disconnected
        style={{ maxHeight: 300, maxWidth: '60%', margin: 'auto' }}
      />
      <DialogTitle>
        <Typography variant="h4" fontSize="1.4em" sx={{ textAlign: 'center' }}>
          {error.title}
        </Typography>
      </DialogTitle>
      <DialogContent sx={{ textAlign: 'center', mb: 1 }}>
        {error.body}
      </DialogContent>
    </Dialog>
  );
};
