import { LoadingButton } from '@mui/lab';
import { Divider, Link, TextField, alpha } from '@mui/material';
import Image from 'next/image';
import { useSnackbar } from 'notistack';
import { FC, useCallback, useMemo } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { Integration } from '@/constants/integrations';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { fetchCurrentOrg } from '@/slices/auth';
import { fetchTeams } from '@/slices/team';
import { useDispatch } from '@/store';
import { linkProvider, checkBitBucketValidity } from '@/utils/auth';
import { depFn } from '@/utils/fn';

interface ConfigureBitbucketModalBodyProps {
  onClose: () => void;
}

interface FormErrors {
  email: string;
  token: string;
}

export const ConfigureBitbucketModalBody: FC<
  ConfigureBitbucketModalBodyProps
> = ({ onClose }) => {
  const email = useEasyState('');
  const token = useEasyState('');
  const { orgId } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const isLoading = useBoolState();

  const showEmailError = useEasyState('');
  const showTokenError = useEasyState('');

  const setEmailError = useCallback(
    (err: string) => depFn(showEmailError.set, err),
    [showEmailError.set]
  );
  const setTokenError = useCallback(
    (err: string) => depFn(showTokenError.set, err),
    [showTokenError.set]
  );

  const clearErrors = useCallback(() => {
    showEmailError.set('');
    showTokenError.set('');
  }, [showEmailError, showTokenError]);

  const validateForm = useCallback((): FormErrors => {
    const errors: FormErrors = { email: '', token: '' };

    if (!email.value.trim()) {
      errors.email = 'Please enter your Bitbucket email';
    }

    if (!token.value.trim()) {
      errors.token = 'Please enter your API Token';
    }

    return errors;
  }, [email.value, token.value]);

  const handleEmailChange = useCallback(
    (val: string) => {
      email.set(val);
      if (showEmailError.value) {
        showEmailError.set('');
      }
    },
    [email, showEmailError]
  );

  const handleTokenChange = useCallback(
    (val: string) => {
      token.set(val);
      if (showTokenError.value) {
        showTokenError.set('');
      }
    },
    [token, showTokenError]
  );

  const handleSubmission = useCallback(async () => {
    clearErrors();

    const errors = validateForm();
    if (errors.email || errors.token) {
      if (errors.email) setEmailError(errors.email);
      if (errors.token) setTokenError(errors.token);
      return;
    }

    depFn(isLoading.true);

    try {
      const res = await checkBitBucketValidity(email.value.trim(), token.value);

      // const scopeHeader =
      //   res.data.headers?.['X-Oauth-Scopes'] ||
      //   res.data.headers?.['x-oauth-scopes'];
      // console.log(scopeHeader);
      // if (!scopeHeader) {
      //   throw new Error(
      //     'Unable to verify API Token permissions. Please ensure your API Token has the required scopes.'
      //   );
      // }

      // const scopes = scopeHeader
      //   .split(',')
      //   .map((s: string) => s.trim())
      //   .filter(Boolean);
      // const missing = getMissingBitBucketScopes(scopes);

      // if (missing.length > 0) {
      //   throw new Error(
      //     `API Token is missing required scopes: ${missing.join(
      //       ', '
      //     )}. Please regenerate with all required permissions.`
      //   );
      // }

      const encodedCredentials = btoa(`${email.value.trim()}:${token.value}`);
      await linkProvider(encodedCredentials, orgId, Integration.BITBUCKET, {
        email: email.value.trim()
      });

      await Promise.all([
        dispatch(fetchCurrentOrg()),
        dispatch(fetchTeams({ org_id: orgId }))
      ]);

      enqueueSnackbar('Bitbucket linked successfully', {
        variant: 'success',
        autoHideDuration: 3000
      });

      onClose();
    } catch (err: any) {
      console.error('Error linking Bitbucket:', err);

      const errorMessage =
        err.message || 'Failed to link Bitbucket. Please try again.';

      // Categorize errors for better UX
      if (
        errorMessage.toLowerCase().includes('email') ||
        errorMessage.toLowerCase().includes('user not found')
      ) {
        setEmailError(errorMessage);
      } else if (
        errorMessage.toLowerCase().includes('token') ||
        errorMessage.toLowerCase().includes('unauthorized') ||
        errorMessage.toLowerCase().includes('authentication')
      ) {
        setTokenError('Invalid API Token. Please check your credentials.');
      } else if (errorMessage.toLowerCase().includes('scope')) {
        setTokenError(errorMessage);
      } else {
        setTokenError(errorMessage);
      }
    } finally {
      depFn(isLoading.false);
    }
  }, [
    clearErrors,
    validateForm,
    email.value,
    token.value,
    isLoading,
    setEmailError,
    setTokenError,
    orgId,
    dispatch,
    enqueueSnackbar,
    onClose
  ]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, action: 'focus-token' | 'submit') => {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (action === 'focus-token') {
          document.getElementById('bitbucket-token')?.focus();
        } else {
          handleSubmission();
        }
      }
    },
    [handleSubmission]
  );

  return (
    <FlexBox gap2>
      <FlexBox gap={2} minWidth="400px" col>
        <FlexBox fullWidth gap2 col>
          <TextField
            id="bitbucket-email"
            label="Email"
            type="email"
            error={!!showEmailError.value}
            helperText={showEmailError.value}
            value={email.value}
            onChange={(e) => handleEmailChange(e.currentTarget.value)}
            onKeyDown={(e) => handleKeyDown(e, 'focus-token')}
            disabled={isLoading.value}
            fullWidth
            autoComplete="email"
          />
          <TextField
            id="bitbucket-token"
            type="password"
            label="API Token"
            error={!!showTokenError.value}
            helperText={showTokenError.value}
            value={token.value}
            onChange={(e) => handleTokenChange(e.currentTarget.value)}
            onKeyDown={(e) => handleKeyDown(e, 'submit')}
            disabled={isLoading.value}
            fullWidth
            autoComplete="current-password"
          />
        </FlexBox>
        <FlexBox justifyBetween alignCenter mt="auto">
          <FlexBox col sx={{ opacity: 0.8 }}>
            <Line>
              Generate an API Token{' '}
              <Link
                href="https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Learn how to generate a Bitbucket API Token"
              >
                here
              </Link>
            </Line>
          </FlexBox>
          <LoadingButton
            loading={isLoading.value}
            variant="contained"
            onClick={handleSubmission}
            disabled={!email.value.trim() || !token.value.trim()}
          >
            Link Bitbucket
          </LoadingButton>
        </FlexBox>
      </FlexBox>
      <Divider orientation="vertical" flexItem />
      <TokenPermissions />
    </FlexBox>
  );
};

const TokenPermissions: FC = () => {
  const imageLoaded = useBoolState(false);

  const expandedStyles = useMemo(() => {
    const base = {
      border: `2px solid ${alpha('#2684FF', 0.6)}`,
      transition: 'all 0.8s ease',
      borderRadius: '8px',
      opacity: 1,
      width: '126px',
      position: 'absolute' as const,
      maxWidth: 'calc(100% - 48px)',
      left: '12px'
    };

    const positions = [
      { top: '300px', height: '32px' },
      { top: '360px', height: '32px' },
      { top: '420px', height: '32px' }
    ];

    return positions.map((cfg) => ({ ...cfg, ...base }));
  }, []);

  return (
    <FlexBox col gap1 maxWidth="100%" overflow="auto">
      <div
        style={{
          overflow: 'hidden',
          borderRadius: '12px',
          height: 'calc(100vh - 300px)',
          maxHeight: '976px',
          overflowY: 'auto',
          position: 'relative',
          background: '#000'
        }}
      >
        <Image
          src="/assets/bitbucketPAT.png"
          width={816}
          height={976}
          alt="Bitbucket App Password required permissions setup"
          onLoadingComplete={imageLoaded.true}
          style={{
            opacity: imageLoaded.value ? 1 : 0,
            transition: 'opacity 0.8s ease',
            filter: 'invert(1)'
          }}
          priority
        />

        {imageLoaded.value &&
          expandedStyles.map((style, index) => (
            <FlexBox key={index} sx={style} />
          ))}

        {!imageLoaded.value && (
          <FlexBox
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <Line secondary>Loading permissions guide...</Line>
          </FlexBox>
        )}
      </div>
      <Line tiny secondary sx={{ opacity: imageLoaded.value ? 1 : 0 }}>
        Scroll to see all required permissions
      </Line>
    </FlexBox>
  );
};
