import { LoadingButton } from '@mui/lab';
import { TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import { FC, useCallback } from 'react';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { Integration } from '@/constants/integrations';
import { useAuth } from '@/hooks/useAuth';
// CLUSTOX: server-resolved workspace, immune to stale persisted redux state
// (see ConfigureGitlabModalBody for the incident this pattern fixed).
import { useClustoxUser } from '@/hooks/useClustoxUser';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { fetchCurrentOrg } from '@/slices/auth';
import { useDispatch } from '@/store';
import { readApiError } from '@/utils/api-error';
import { linkProvider, unlinkProvider } from '@/utils/auth';
import { checkDomainWithRegex } from '@/utils/domainCheck';
import { depFn } from '@/utils/fn';

const CONNECTION_ERROR =
  'Could not connect to Jenkins with these credentials. Check the base URL, username, and API token.';

/**
 * CLUSTOX: credentials form for connecting a Jenkins instance.
 *
 * There is no dry-run endpoint -- the only server-side call that actually
 * reaches Jenkins is the job list, which reads credentials out of the
 * Integration row. So "validate before saving" is implemented as save, then
 * probe, then roll back the row if the probe fails, rather than a true
 * pre-save check. That keeps a failed attempt from leaving the workspace
 * looking "linked" with credentials nothing can use.
 */
export const ClustoxJenkinsSetup: FC<{ onLinked?: () => void }> = ({
  onLinked
}) => {
  const baseUrl = useEasyState('');
  const username = useEasyState('');
  const apiToken = useEasyState('');

  const baseUrlError = useEasyState('');
  const usernameError = useEasyState('');
  const tokenError = useEasyState('');

  const { orgId: contextOrgId } = useAuth();
  const { orgId: sessionOrgId } = useClustoxUser();
  const orgId = sessionOrgId ?? contextOrgId;

  const dispatch = useDispatch();
  const { enqueueSnackbar } = useSnackbar();
  const isLoading = useBoolState(false);

  const handleSubmit = useCallback(async () => {
    depFn(baseUrlError.set, '');
    depFn(usernameError.set, '');
    depFn(tokenError.set, '');

    let hasError = false;
    if (!baseUrl.value || !checkDomainWithRegex(baseUrl.value)) {
      depFn(
        baseUrlError.set,
        'Enter a valid URL, including the http(s):// scheme'
      );
      hasError = true;
    }
    if (!username.value) {
      depFn(usernameError.set, 'Username is required');
      hasError = true;
    }
    if (!apiToken.value) {
      depFn(tokenError.set, 'API token is required');
      hasError = true;
    }
    if (!orgId) {
      depFn(
        baseUrlError.set,
        'No workspace selected. Reload the page and try again.'
      );
      hasError = true;
    }
    if (hasError) return;

    depFn(isLoading.true);
    // CLUSTOX: which of the two calls below failed decides whether the server's
    // message is about Jenkins at all. A 400 from the credential save is a
    // schema complaint about this form; a 400 from the probe is the analytics
    // server refusing the address, and that text is the whole point.
    let credentialsSaved = false;
    try {
      await linkProvider(apiToken.value, orgId, Integration.JENKINS, {
        base_url: baseUrl.value,
        username: username.value
      });
      credentialsSaved = true;

      // CLUSTOX: the actual connection probe -- this is the first call that
      // hits the real Jenkins instance with the credentials just saved.
      await handleApi('/clustox/jenkins/jobs', {
        params: { org_id: orgId }
      });

      await dispatch(fetchCurrentOrg());
      enqueueSnackbar('Jenkins connected successfully', {
        variant: 'success',
        autoHideDuration: 2000
      });
      onLinked?.();
    } catch (e) {
      // CLUSTOX: message only. If the failing call is the credential save, the
      // axios error object carries config.data with the raw API token in it,
      // which would then sit in the browser console.
      console.error(
        'Failed to connect Jenkins',
        e instanceof Error ? e.message : String(e)
      );
      // CLUSTOX: don't leave a workspace "linked" to credentials that don't
      // work -- the mapping screen would otherwise open to a broken job list.
      // True of a refused address too: nothing here can reach that Jenkins.
      await unlinkProvider(orgId, Integration.JENKINS).catch(() => {});

      // CLUSTOX: a 400 from the probe is the server naming something about this
      // URL it will not fetch -- a private, loopback or link-local address, or
      // a missing scheme. Reported as CONNECTION_ERROR it sends the admin to
      // re-check a username and token that are fine.
      const { status, message } = readApiError(e);
      depFn(
        baseUrlError.set,
        credentialsSaved && status === 400 && message
          ? message
          : CONNECTION_ERROR
      );
    } finally {
      depFn(isLoading.false);
    }
  }, [
    apiToken.value,
    baseUrl.value,
    baseUrlError.set,
    dispatch,
    enqueueSnackbar,
    isLoading.false,
    isLoading.true,
    onLinked,
    orgId,
    tokenError.set,
    username.value,
    usernameError.set
  ]);

  return (
    <FlexBox col gap={2} minWidth="400px">
      <Line>
        Enter your Jenkins connection details below{' '}
        <Line bigish ml={1 / 2} error>
          *
        </Line>
      </Line>

      <FlexBox col fullWidth minHeight="72px">
        <TextField
          autoFocus
          error={!!baseUrlError.value}
          sx={{ width: '100%' }}
          value={baseUrl.value}
          onChange={(e) => {
            baseUrl.set(e.currentTarget.value);
            baseUrlError.set('');
          }}
          label="Jenkins Base URL"
          placeholder="https://jenkins.example.com"
        />
        <Line error tiny mt={1} minHeight="18px">
          {baseUrlError.value}
        </Line>
      </FlexBox>

      <FlexBox col fullWidth minHeight="72px">
        <TextField
          error={!!usernameError.value}
          sx={{ width: '100%' }}
          value={username.value}
          onChange={(e) => {
            username.set(e.currentTarget.value);
            usernameError.set('');
          }}
          label="Username"
        />
        <Line error tiny mt={1} minHeight="18px">
          {usernameError.value}
        </Line>
      </FlexBox>

      <FlexBox col fullWidth minHeight="72px">
        <TextField
          error={!!tokenError.value}
          sx={{ width: '100%' }}
          value={apiToken.value}
          onChange={(e) => {
            apiToken.set(e.currentTarget.value);
            tokenError.set('');
          }}
          label="API Token"
          type="password"
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            }
          }}
        />
        <Line error tiny mt={1} minHeight="18px">
          {tokenError.value}
        </Line>
      </FlexBox>

      <FlexBox justifyEnd mt={1}>
        <LoadingButton
          loading={isLoading.value}
          variant="contained"
          onClick={handleSubmit}
        >
          Connect Jenkins
        </LoadingButton>
      </FlexBox>
    </FlexBox>
  );
};
