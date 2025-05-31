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

interface ConfigureBitbucketModalBodyProps {
  onClose: () => void;
}

interface FormErrors {
  username: string;
  password: string;
}

export const ConfigureBitbucketModalBody: FC<ConfigureBitbucketModalBodyProps> = ({ onClose }) => {
  const username = useEasyState('');
  const password = useEasyState('');
  const { orgId } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const isLoading = useBoolState();

  const showUsernameError = useEasyState('');
  const showPasswordError = useEasyState('');

  const setUsernameError = useCallback(
    (err: string) => depFn(showUsernameError.set, err),
    [showUsernameError.set]
  );
  const setPasswordError = useCallback(
    (err: string) => depFn(showPasswordError.set, err),
    [showPasswordError.set]
  );

  const clearErrors = useCallback(() => {
    showUsernameError.set('');
    showPasswordError.set('');
  }, [showUsernameError.set, showPasswordError.set]);

  const validateForm = useCallback((): FormErrors => {
    const errors: FormErrors = { username: '', password: '' };
    
    if (!username.value.trim()) {
      errors.username = 'Please enter your Bitbucket username';
    }
    
    if (!password.value.trim()) {
      errors.password = 'Please enter your App Password';
    }
    
    return errors;
  }, [username.value, password.value]);

  const handleUsernameChange = useCallback((val: string) => {
    username.set(val);
    if (showUsernameError.value) {
      showUsernameError.set('');
    }
  }, [username.set, showUsernameError.value, showUsernameError.set]);

  const handlePasswordChange = useCallback((val: string) => {
    password.set(val);
    if (showPasswordError.value) {
      showPasswordError.set('');
    }
  }, [password.set, showPasswordError.value, showPasswordError.set]);

  const handleSubmission = useCallback(async () => {
    clearErrors();
    
    const errors = validateForm();
    if (errors.username || errors.password) {
      if (errors.username) setUsernameError(errors.username);
      if (errors.password) setPasswordError(errors.password);
      return;
    }

    depFn(isLoading.true);
    
    try {
      const res = await checkBitBucketValidity(username.value.trim(), password.value);
      
      const scopeHeader = res.headers?.["X-Oauth-Scopes"] || res.headers?.["x-oauth-scopes"];
      
      if (!scopeHeader) {
        throw new Error('Unable to verify App Password permissions. Please ensure your App Password has the required scopes.');
      }
      
      const scopes = scopeHeader.split(',').map((s: string) => s.trim()).filter(Boolean);
      const missing = getMissingBitBucketScopes(scopes);

      if (missing.length > 0) {
        throw new Error(`App Password is missing required scopes: ${missing.join(', ')}. Please regenerate with all required permissions.`);
      }

      const encodedCredentials = btoa(`${username.value.trim()}:${password.value}`);
      await linkProvider(encodedCredentials, orgId, Integration.BITBUCKET, {
        username: username.value.trim()
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
      
      const errorMessage = err.message || 'Failed to link Bitbucket. Please try again.';
      
      // Categorize errors for better UX
      if (errorMessage.toLowerCase().includes('username') || 
          errorMessage.toLowerCase().includes('user not found')) {
        setUsernameError(errorMessage);
      } else if (errorMessage.toLowerCase().includes('password') || 
                 errorMessage.toLowerCase().includes('unauthorized') ||
                 errorMessage.toLowerCase().includes('authentication')) {
        setPasswordError('Invalid App Password. Please check your credentials.');
      } else if (errorMessage.toLowerCase().includes('scope')) {
        setPasswordError(errorMessage);
      } else {
        setPasswordError(errorMessage);
      }
    } finally {
      depFn(isLoading.false);
    }
  }, [
    clearErrors,
    validateForm,
    username.value,
    password.value,
    isLoading,
    setUsernameError,
    setPasswordError,
    orgId,
    dispatch,
    enqueueSnackbar,
    onClose
  ]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent, action: 'focus-password' | 'submit') => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (action === 'focus-password') {
        document.getElementById('bitbucket-password')?.focus();
      } else {
        handleSubmission();
      }
    }
  }, [handleSubmission]);

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
            onChange={(e) => handleUsernameChange(e.currentTarget.value)}
            onKeyDown={(e) => handleKeyDown(e, 'focus-password')}
            disabled={isLoading.value}
            fullWidth
            autoComplete="username"
          />
          <TextField
            id="bitbucket-password"
            type="password"
            label="App Password"
            error={!!showPasswordError.value}
            helperText={showPasswordError.value}
            value={password.value}
            onChange={(e) => handlePasswordChange(e.currentTarget.value)}
            onKeyDown={(e) => handleKeyDown(e, 'submit')}
            disabled={isLoading.value}
            fullWidth
            autoComplete="current-password"
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
                aria-label="Learn how to generate a Bitbucket App Password"
              >
                here
              </Link>
            </Line>
          </FlexBox>
          <LoadingButton
            loading={isLoading.value}
            variant="contained"
            onClick={handleSubmission}
            disabled={!username.value.trim() || !password.value.trim()}
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
    
    return positions.map(cfg => ({ ...cfg, ...base }));
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

        {imageLoaded.value && expandedStyles.map((style, index) => (
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
