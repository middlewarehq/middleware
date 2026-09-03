import { Link, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { useSnackbar } from 'notistack';
import { FC, useCallback } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { Integration } from '@/constants/integrations';
import { useAuth } from '@/hooks/useAuth';
// CLUSTOX: server-resolved workspace, immune to stale persisted redux state.
import { useClustoxUser } from '@/hooks/useClustoxUser';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { fetchCurrentOrg } from '@/slices/auth';
import { useDispatch } from '@/store';
import {
  checkJiraValidity,
  linkProvider,
  normalizeJiraSiteUrl
} from '@/utils/auth';
import { depFn } from '@/utils/fn';

export const ConfigureJiraModalBody: FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const siteUrl = useEasyState('');
  const email = useEasyState('');
  const token = useEasyState('');
  const { orgId: contextOrgId } = useAuth();
  // CLUSTOX: prefer the server-resolved workspace. The redux copy is persisted
  // by redux-persist and can rehydrate empty from a previous session, which
  // previously produced a POST to /orgs/undefined/integration.
  const { orgId: sessionOrgId } = useClustoxUser();
  const orgId = sessionOrgId ?? contextOrgId;
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const isLoading = useBoolState();

  const showError = useEasyState<string>('');

  const setError = useCallback(
    (error: string) => {
      depFn(showError.set, error);
    },
    [showError.set]
  );

  const handleSubmission = useCallback(async () => {
    if (!siteUrl.value || !email.value || !token.value) {
      setError('Please fill in all three fields');
      return;
    }
    if (!orgId) {
      setError('No workspace selected. Reload the page and try again.');
      return;
    }

    isLoading.true();
    try {
      const result = await checkJiraValidity(
        siteUrl.value,
        email.value,
        token.value
      );

      if (!result.valid) {
        setError(
          result.reason === 'unauthorized'
            ? 'That email/API token combination was rejected by Jira.'
            : result.reason === 'unreachable'
              ? "Couldn't reach that Jira site — check the URL."
              : 'Could not verify this Jira account. Please try again.'
        );
        return;
      }

      await linkProvider(token.value, orgId, Integration.JIRA, {
        site_url: normalizeJiraSiteUrl(siteUrl.value),
        email: email.value
      });

      // Await, don't fire-and-forget: closing the modal before this
      // resolves would let the Jira card render on the pre-link ("not
      // linked") state for a moment -- same race already fixed for
      // GitHub/GitLab's own link flow.
      await dispatch(fetchCurrentOrg());

      enqueueSnackbar(
        result.displayName
          ? `Jira linked — signed in as ${result.displayName}`
          : 'Jira linked successfully',
        { variant: 'success', autoHideDuration: 3000 }
      );
      onClose();
    } catch (e: any) {
      setError(e.message || 'Unknown error');
      console.error(e);
    } finally {
      isLoading.false();
    }
  }, [
    siteUrl.value,
    email.value,
    token.value,
    dispatch,
    enqueueSnackbar,
    isLoading.false,
    isLoading.true,
    onClose,
    orgId,
    setError
  ]);

  return (
    <FlexBox gap={2} col minWidth={'420px'}>
      <FlexBox>Enter your Jira workspace details below.</FlexBox>

      <TextField
        label="Jira Site URL"
        placeholder="yourcompany.atlassian.net"
        value={siteUrl.value}
        onChange={(e) => siteUrl.set(e.target.value)}
        InputLabelProps={{ shrink: true }}
      />
      <TextField
        label="Email"
        type="email"
        value={email.value}
        onChange={(e) => email.set(e.target.value)}
        InputLabelProps={{ shrink: true }}
      />
      <FlexBox col gap1>
        <TextField
          label="API Token"
          type="password"
          value={token.value}
          onChange={(e) => token.set(e.target.value)}
          // Browsers apply their password-autofill heuristics to any
          // type="password" field, token or not. Keeping the label
          // permanently shrunk removes any race between that and React
          // learning the value.
          InputLabelProps={{ shrink: true }}
        />
        <Line tiny secondary>
          Generate one at{' '}
          <Link
            href="https://id.atlassian.com/manage-profile/security/api-tokens"
            target="_blank"
            rel="noopener noreferrer"
          >
            id.atlassian.com/manage-profile/security
          </Link>
        </Line>
      </FlexBox>

      <Line error tiny minHeight={'18px'}>
        {showError.value}
      </Line>

      <FlexBox justifyEnd>
        <LoadingButton
          loading={isLoading.value}
          variant="contained"
          onClick={handleSubmission}
        >
          Verify &amp; link
        </LoadingButton>
      </FlexBox>
    </FlexBox>
  );
};
