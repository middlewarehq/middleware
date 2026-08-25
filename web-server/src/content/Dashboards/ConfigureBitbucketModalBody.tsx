import { LoadingButton } from '@mui/lab';
import { Link, TextField } from '@mui/material';
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
import { fetchTeams } from '@/slices/team';
import { useDispatch } from '@/store';
import { checkBitbucketValidity, linkProvider } from '@/utils/auth';
import { depFn } from '@/utils/fn';

// A plain shape check, not deliverability -- the value is only ever the Basic
// auth username, so the test is "looks like an email", nothing deeper.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const ConfigureBitbucketModalBody: FC<{
  onClose: () => void;
}> = ({ onClose }) => {
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

  const emailError = useEasyState<string>('');
  const tokenError = useEasyState<string>('');

  const handleEmailChange = (value: string) => {
    email.set(value);
    emailError.set('');
  };

  const handleTokenChange = (value: string) => {
    token.set(value);
    tokenError.set('');
  };

  const handleSubmission = useCallback(async () => {
    // CLUSTOX: trim both fields -- a token copied from Atlassian's UI often
    // arrives with a trailing newline, which corrupts the Basic auth pair
    // into a guaranteed 401 that reads exactly like a wrong token.
    const emailValue = email.value.trim();
    const tokenValue = token.value.trim();
    try {
      if (!EMAIL_PATTERN.test(emailValue)) {
        emailError.set('Enter the Atlassian account email for this token');
        throw Error('Invalid email');
      }
      if (!tokenValue) {
        tokenError.set('Please enter an API token');
        throw Error('Empty token');
      }
      // CLUSTOX: refuse rather than POST to /orgs/undefined/integration.
      if (!orgId) {
        tokenError.set('No workspace selected. Reload the page and try again.');
        throw Error('No workspace');
      }
    } catch (e) {
      console.error(e);
      return;
    }

    depFn(isLoading.true);
    await checkBitbucketValidity(emailValue, tokenValue)
      .then(({ valid, reason }) => {
        if (!valid) {
          // CLUSTOX: name the real problem when the server could tell it
          // apart. A scoped token without account read access works against
          // repositories but fails the sync's own /2.0/user validity check,
          // so "invalid credentials" would send the user hunting the wrong
          // bug.
          throw new Error(
            reason === 'missing_account_scope'
              ? 'This token works but is missing the Account read scope. Recreate it with account, repository and pullrequest read scopes.'
              : 'Invalid email or API token'
          );
        }
      })
      .then(async () => {
        try {
          // CLUSTOX: the email rides in provider_meta -- it is the Basic auth
          // username, not a secret. Only the token is encrypted.
          return await linkProvider(tokenValue, orgId, Integration.BITBUCKET, {
            email: emailValue
          });
        } catch (e: any) {
          throw new Error(
            `Failed to link Bitbucket${e?.message ? `: ${e?.message}` : ''}`,
            e
          );
        }
      })
      .then(() => {
        dispatch(fetchCurrentOrg());
        dispatch(fetchTeams({ org_id: orgId }));
        enqueueSnackbar('Bitbucket linked successfully', {
          variant: 'success',
          autoHideDuration: 2000
        });
        onClose();
      })
      .catch((e) => {
        tokenError.set(e.message);
        console.error(`Error while linking token: ${e.message}`, e);
      })
      .finally(isLoading.false);
  }, [
    dispatch,
    email.value,
    emailError,
    enqueueSnackbar,
    isLoading.false,
    isLoading.true,
    onClose,
    orgId,
    token.value,
    tokenError
  ]);

  const focusTokenInput = useCallback(() => {
    if (!token.value) document.getElementById('bitbucket-api-token')?.focus();
    else handleSubmission();
  }, [token.value, handleSubmission]);

  return (
    <FlexBox gap2>
      <FlexBox gap={2} minWidth={'400px'} col>
        <FlexBox>
          Enter your Atlassian account email and API token{' '}
          <Line bigish ml={1 / 2} error>
            *
          </Line>
        </FlexBox>
        <FlexBox fullWidth minHeight={'80px'} col>
          <TextField
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                focusTokenInput();
                return;
              }
            }}
            error={!!emailError.value}
            sx={{ width: '100%' }}
            value={email.value}
            onChange={(e) => handleEmailChange(e.currentTarget.value)}
            label="Atlassian account email"
            InputLabelProps={{ shrink: true }}
          />
          <Line error tiny mt={1} minHeight={'18px'}>
            {emailError.value}
          </Line>
        </FlexBox>

        <FlexBox fullWidth minHeight={'80px'} col>
          <TextField
            id="bitbucket-api-token"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                handleSubmission();
                return;
              }
            }}
            error={!!tokenError.value}
            sx={{ width: '100%' }}
            value={token.value}
            onChange={(e) => handleTokenChange(e.currentTarget.value)}
            label="Atlassian API Token"
            type="password"
            // Browsers apply their password-autofill heuristics to any
            // type="password" field, token or not. Keeping the label
            // permanently shrunk removes any race between that and React
            // learning the value.
            InputLabelProps={{ shrink: true }}
          />
          <Line error tiny mt={1} minHeight={'18px'}>
            {tokenError.value}
          </Line>
          <FlexBox>
            <Line tiny mt={1} primary sx={{ cursor: 'pointer' }}>
              <Link
                href="https://id.atlassian.com/manage-profile/security/api-tokens"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Line underline sx={{ textUnderlineOffset: '2px' }}>
                  Create an API token with account, repository and pullrequest
                  read scopes
                </Line>
              </Link>
              <Line ml={'5px'}>{' ->'}</Line>
            </Line>
          </FlexBox>
        </FlexBox>

        <FlexBox justifyBetween alignCenter mt={'auto'}>
          <FlexBox col sx={{ opacity: 0.8 }}>
            <Line>Learn more about Atlassian</Line>
            <Line>
              API tokens
              <Link
                ml={1 / 2}
                href="https://support.atlassian.com/atlassian-account/docs/manage-api-tokens-for-your-atlassian-account/"
                target="_blank"
                rel="noopener noreferrer"
              >
                here
              </Link>
            </Line>
          </FlexBox>
          <FlexBox gap={2} justifyEnd>
            <LoadingButton
              loading={isLoading.value}
              variant="contained"
              onClick={handleSubmission}
            >
              Confirm
            </LoadingButton>
          </FlexBox>
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
};
