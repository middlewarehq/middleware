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
import {
  linkProvider,
  checkBitBucketValidity,
  getMissingBitBucketScopes
} from '@/utils/auth';
import { depFn } from '@/utils/fn';

export const ConfigureBitbucketModalBody: FC<{ onClose: () => void }> = ({ onClose }) => {
  const username = useEasyState('');
  const password = useEasyState('');
  const customDomain = useEasyState('');
  const { orgId } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const isLoading = useBoolState();

  const showUsernameError = useEasyState('');
  const showPasswordError = useEasyState('');
  const showDomainError = useEasyState('');

  const setUsernameError = useCallback(
    (err: string) => depFn(showUsernameError.set, err),
    [showUsernameError.set]
  );
  const setPasswordError = useCallback(
    (err: string) => depFn(showPasswordError.set, err),
    [showPasswordError.set]
  );
  const setDomainError = useCallback(
    (err: string) => depFn(showDomainError.set, err),
    [showDomainError.set]
  );

  const checkDomainWithRegex = (domain: string) => {
    const regex = /^(https?:\/\/)[\w\-]+(\.[\w\-]+)+(\:\d{1,5})?(\/.*)?$/;
    return regex.test(domain);
  };

  const handleUsernameChange = (val: string) => {
    username.set(val);
    showUsernameError.set('');
  };
  const handlePasswordChange = (val: string) => {
    password.set(val);
    showPasswordError.set('');
  };
  const handleDomainChange = (val: string) => {
    customDomain.set(val);
    showDomainError.set('');
  };

  const handleSubmission = useCallback(async () => {
    try {
      if (!username.value) {
        setUsernameError('Please enter your Bitbucket username');
        throw new Error('Empty Username');
      }
      if (!password.value) {
        setPasswordError('Please enter your App Password');
        throw new Error('Empty Password');
      }
      if (customDomain.value && !checkDomainWithRegex(customDomain.value)) {
        setDomainError('Please enter a valid domain URL');
        throw new Error('Invalid Domain');
      }
    } catch (err) {
      console.error(err);
      return;
    }

    depFn(isLoading.true);
    try {
      const res = await checkBitBucketValidity(
        username.value,
        password.value,
        customDomain.value
      );
      console.log(res.headers)
      const scopeHeader = res.headers["X-Oauth-Scopes"] || res.headers["x-oauth-scopes"];
      console.log(scopeHeader)
      const scopes = scopeHeader.split(',').map((s: string) => s.trim());
      console.log(scopes)
      const missing = getMissingBitBucketScopes(scopes);

      if (missing.length) {
        throw new Error(`App Password is missing scopes: ${missing.join(', ')}`);
      }

      await linkProvider(username.value, orgId, Integration.BITBUCKET, {
        password: password.value,
        custom_domain: customDomain.value || undefined
      });

      dispatch(fetchCurrentOrg());
      dispatch(fetchTeams({ org_id: orgId }));
      enqueueSnackbar('Bitbucket linked successfully', {
        variant: 'success',
        autoHideDuration: 2000
      });
      onClose();
    } catch (err: any) {
      console.error('Error linking Bitbucket:', err);
      const msg = err.message || 'Failed to link Bitbucket';
      if (msg.includes('Username')) setUsernameError(msg);
      else if (msg.includes('Password') || msg.includes('scopes')) setPasswordError(msg);
      else setDomainError(msg);
    } finally {
      depFn(isLoading.false);
    }
  }, [
    username.value,
    password.value,
    customDomain.value,
    dispatch,
    enqueueSnackbar,
    orgId,
    onClose,
    setUsernameError,
    setPasswordError,
    setDomainError,
    isLoading
  ]);

  const isDomainFocus = useBoolState(false);

  return (
    <FlexBox gap2>
      <FlexBox gap={2} minWidth="400px" col>
        <FlexBox fullWidth gap2 col>
          <TextField
            id="bitbucket-username"
            label="Username"
            error={!!showUsernameError.value}
            helperText={showUsernameError.value}
            value={username.value}
            onChange={(e: { currentTarget: { value: string; }; }) => handleUsernameChange(e.currentTarget.value)}
            onKeyDown={(e: { key: string; preventDefault: () => void; }) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('bitbucket-password')?.focus();
              }
            }}
            fullWidth
          />
          <TextField
            id="bitbucket-password"
            type="password"
            label="App Password"
            error={!!showPasswordError.value}
            helperText={showPasswordError.value}
            value={password.value}
            onChange={(e: { currentTarget: { value: string; }; }) => handlePasswordChange(e.currentTarget.value)}
            onKeyDown={(e: { key: string; preventDefault: () => void; }) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                document.getElementById('bitbucket-custom-domain')?.focus();
              }
            }}
            fullWidth
          />
          <TextField
            id="bitbucket-custom-domain"
            label={
              isDomainFocus.value || customDomain.value ? 'Custom Domain' : '(Optional)'
            }
            error={!!showDomainError.value}
            helperText={showDomainError.value}
            value={customDomain.value}
            onChange={(e: { currentTarget: { value: string; }; }) => handleDomainChange(e.currentTarget.value)}
            onFocus={isDomainFocus.true}
            onBlur={isDomainFocus.false}
            onKeyDown={(e: { key: string; preventDefault: () => void; }) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSubmission();
              }
            }}
            fullWidth
          />
        </FlexBox>
        <FlexBox justifyBetween alignCenter mt="auto">
          <FlexBox col sx={{ opacity: 0.8 }}>
            <Line>
              Generate an App Password{' '}
              <Link
                href="https://support.atlassian.com/bitbucket-cloud/docs/app-passwords/"
                target="_blank"
                rel="noopener noreferrer"
              >
                here
              </Link>
            </Line>
          </FlexBox>
          <LoadingButton
            loading={isLoading.value}
            variant="contained"
            onClick={handleSubmission}
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

const TokenPermissions = () => {
  const imageLoaded = useBoolState(false);
  const expandedStyles = useMemo(() => {
    const base = {
      border: `2px solid ${alpha('#2684FF', 0.6)}`,
      transition: 'all 0.8s ease',
      borderRadius: '8px',
      opacity: 1,
      width: '126px',
      position: 'absolute',
      maxWidth: 'calc(100% - 48px)',
      left: '12px'
    };
    return [
      { top: '300px', height: '32px' },
      { top: '360px', height: '32px' },
      { top: '420px', height: '32px' }
    ].map(cfg => ({ ...cfg, ...base }));
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
          alt="App Password permissions"
          onLoadingComplete={imageLoaded.true}
          style={{ opacity: imageLoaded.value ? 1 : 0, transition: 'opacity 0.8s ease', filter: 'invert(1)' }}
        />

        {imageLoaded.value && expandedStyles.map((style: any, i: any) => <FlexBox key={i} sx={style} />)}

        {!imageLoaded.value && (
          <FlexBox
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            <Line secondary>Loading...</Line>
          </FlexBox>
        )}
      </div>
      <Line tiny secondary sx={{ opacity: imageLoaded.value ? 1 : 0 }}>
        Scroll to see all required permissions
      </Line>
    </FlexBox>
  );
};
