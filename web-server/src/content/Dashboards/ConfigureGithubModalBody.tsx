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
  checkGitHubValidity,
  linkProvider,
  getMissingPATScopes
} from '@/utils/auth';
import { checkDomainWithRegex } from '@/utils/domainCheck';
import { depFn } from '@/utils/fn';

export const ConfigureGithubModalBody: FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const token = useEasyState('');
  const { orgId } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const customDomain = useEasyState('');
  const dispatch = useDispatch();
  const isLoading = useBoolState();

  const showError = useEasyState<string>('');
  const showDomainError = useEasyState<string>('');

  const setError = useCallback(
    (error: string) => {
      console.error(error);
      depFn(showError.set, error);
    },
    [showError.set]
  );
  const setDomainError = useCallback(
    (error: string) => {
      depFn(showDomainError.set, error);
    },
    [showDomainError.set]
  );

  const handleChange = (e: string) => {
    token.set(e);
    showError.set('');
  };
  const handleDomainChange = (e: string) => {
    customDomain.set(e);
    showDomainError.set('');
  };

  const handleSubmission = useCallback(async () => {
    if (!token.value) {
      setError('Please enter a valid token');
      return;
    }
    if (
      customDomain.value &&
      !checkDomainWithRegex(customDomain.valueRef.current)
    ) {
      setDomainError('Please enter a valid domain');
      return;
    }

    isLoading.true();
    try {
      const isValid = await checkGitHubValidity(
        token.value,
        customDomain.valueRef.current
      );
      if (!isValid) {
        setError('Invalid token');
        return;
      }

      const missingScopes = await getMissingPATScopes(
        token.value,
        customDomain.valueRef.current
      );
      if (missingScopes.length > 0) {
        setError(`Token is missing scopes: ${missingScopes.join(', ')}`);
        return;
      }

      await linkProvider(token.value, orgId, Integration.GITHUB, {
        custom_domain: customDomain.valueRef.current
      });

      dispatch(fetchCurrentOrg());
      dispatch(fetchTeams({ org_id: orgId }));
      enqueueSnackbar('Github linked successfully', {
        variant: 'success',
        autoHideDuration: 2000
      });
      onClose();
    } catch (e: any) {
      setError(e.message || 'Unknown error');
      console.error(e);
    } finally {
      isLoading.false();
    }
  }, [
    token.value,
    customDomain.value,
    dispatch,
    enqueueSnackbar,
    isLoading.false,
    isLoading.true,
    onClose,
    orgId,
    setError,
    setDomainError
  ]);

  const isDomainInputFocus = useBoolState(false);

  const focusDomainInput = useCallback(() => {
    if (!customDomain.value)
      document.getElementById('gitlab-custom-domain')?.focus();
    else handleSubmission();
  }, [customDomain.value, handleSubmission]);

  return (
    <FlexBox gap2>
      <FlexBox gap={2} minWidth={'400px'} col>
        <FlexBox>Enter you Github token below.</FlexBox>
        <FlexBox fullWidth minHeight={'80px'} col>
          <TextField
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                handleSubmission();
                focusDomainInput();
                return;
              }
            }}
            error={!!showError.value}
            sx={{ width: '100%' }}
            value={token.value}
            onChange={(e) => {
              handleChange(e.currentTarget.value);
            }}
            label="Github Personal Access Token"
            type="password"
          />
          <Line error tiny mt={1}>
            {showError.value}
          </Line>
          <FlexBox>
            <Line tiny mt={1} primary sx={{ cursor: 'pointer' }}>
              <Link
                href="https://github.com/settings/tokens"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Line
                  underline
                  sx={{
                    textUnderlineOffset: '2px'
                  }}
                >
                  Generate new classic token
                </Line>
              </Link>
              <Line ml={'5px'}>{' ->'}</Line>
            </Line>
          </FlexBox>
        </FlexBox>
        <FlexBox gap2 col>
          <FlexBox alignBase gap1>
            Custom domain
          </FlexBox>
          <TextField
            id="github-custom-domain"
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                e.nativeEvent.stopImmediatePropagation();
                handleSubmission();
                return;
              }
            }}
            error={!!showDomainError.value}
            sx={{ width: '100%' }}
            value={customDomain.value}
            onChange={(e) => handleDomainChange(e.currentTarget.value)}
            label={
              isDomainInputFocus.value || customDomain.value
                ? 'Custom Domain'
                : '(Optional)'
            }
            onFocus={isDomainInputFocus.true}
            onBlur={isDomainInputFocus.false}
            helperText={
              isDomainInputFocus.value || customDomain.value
                ? 'Example: https://github.mycompany.com'
                : ''
            }
            placeholder="https://github.mycompany.com"
          />
        </FlexBox>
        <Line error tiny mt={1} minHeight={'18px'}>
          {showDomainError.value}
        </Line>

        <FlexBox justifyBetween alignCenter mt={'auto'}>
          <FlexBox col sx={{ opacity: 0.8 }}>
            <Line>Learn more about Github</Line>
            <Line>
              Personal Access Token (PAT)
              <Link
                ml={1 / 2}
                href="https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens"
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
      <Divider orientation="vertical" flexItem />
      <TokenPermissions />
    </FlexBox>
  );
};

const TokenPermissions = () => {
  const imageLoaded = useBoolState(false);

  const expandedStyles = useMemo(() => {
    const baseStyles = {
      border: `2px solid ${alpha('rgb(256,0,0)', 0.4)}`,
      transition: 'all 0.8s ease',
      borderRadius: '12px',
      opacity: 1,
      width: '240px',
      position: 'absolute',
      maxWidth: 'calc(100% - 48px)',
      left: '24px'
    };

    return [
      {
        height: '170px',
        top: '58px'
      },
      {
        height: '42px',
        top: '230px'
      },
      {
        height: '120px',

        top: '378px'
      },
      {
        height: '120px',

        top: '806px'
      }
    ].map((item) => ({ ...item, ...baseStyles }));
  }, []);

  return (
    <FlexBox col gap1 maxWidth={'100%'} overflow={'auto'}>
      <div
        style={{
          overflow: 'hidden',
          borderRadius: '12px',
          height: 'calc(100vh - 300px)',
          maxHeight: '1257px',
          overflowY: 'auto',
          transition: 'all 0.8s ease',
          position: 'relative',
          maxWidth: '100%',
          background: '#0D1017'
        }}
      >
        <Image
          onLoadingComplete={imageLoaded.true}
          style={{
            position: 'relative',
            transition: 'all 0.8s ease',
            opacity: !imageLoaded.value ? 0 : 1
          }}
          src="/assets/PAT_permissions.png"
          width={816}
          height={1257}
          alt="PAT_permissions"
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
