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
  checkGitLabValidity,
  getMissingGitLabScopes
} from '@/utils/auth';
import { checkDomainWithRegex } from '@/utils/domainCheck';
import { depFn } from '@/utils/fn';

export const ConfigureGitlabModalBody: FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const token = useEasyState('');
  const customDomain = useEasyState('');
  const { orgId } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const isLoading = useBoolState();

  const showScopeError = useEasyState<string>('');
  const showDomainError = useEasyState<string>('');

  const setScopeError = useCallback(
    (error: string) => {
      depFn(showScopeError.set, error);
    },
    [showScopeError.set]
  );

  const setDomainError = useCallback(
    (error: string) => {
      depFn(showDomainError.set, error);
    },
    [showDomainError.set]
  );

  const handleTokenChange = (e: string) => {
    token.set(e);
    showScopeError.set('');
  };

  const handleDomainChange = (e: string) => {
    customDomain.set(e);
    showDomainError.set('');
  };

  const handleSubmission = useCallback(async () => {
    try {
      if (!token.value) {
        setScopeError('Please enter a valid token');
        throw Error('Empty token');
      }

      if (customDomain.value && !checkDomainWithRegex(customDomain.value)) {
        setDomainError('Please enter a valid domain');
        throw Error('Invalid domain');
      }
    } catch (e) {
      console.error(e);
      return;
    }

    depFn(isLoading.true);
    await checkGitLabValidity(token.value, customDomain.value)
      .then(async (res) => {
        return res;
      })
      .then(async (response) => {
        const res = getMissingGitLabScopes(response.scopes);
        if (res.length) {
          throw new Error(`Token is missing scopes: ${res.join(', ')}`);
        }
      })
      .then(async () => {
        try {
          return await linkProvider(token.value, orgId, Integration.GITLAB, {
            custom_domain: customDomain.value
          });
        } catch (e: any) {
          throw new Error(
            `Failed to link Gitlab${e?.message ? `: ${e?.message}` : ''}`,
            e
          );
        }
      })
      .then(() => {
        dispatch(fetchCurrentOrg());
        dispatch(
          fetchTeams({
            org_id: orgId
          })
        );
        enqueueSnackbar('Gitlab linked successfully', {
          variant: 'success',
          autoHideDuration: 2000
        });
        onClose();
      })
      .catch((e) => {
        setScopeError(e.message);
        console.error(`Error while linking token: ${e.message}`, e);
      })
      .finally(isLoading.false);
  }, [
    customDomain.value,
    dispatch,
    enqueueSnackbar,
    isLoading.false,
    isLoading.true,
    onClose,
    orgId,
    setDomainError,
    setScopeError,
    token.value
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
        <FlexBox>
          Enter your Gitlab token below{' '}
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
                focusDomainInput();
                return;
              }
            }}
            error={!!showScopeError.value}
            sx={{ width: '100%' }}
            value={token.value}
            onChange={(e) => {
              handleTokenChange(e.currentTarget.value);
            }}
            label="Gitlab Personal Access Token"
            type="password"
          />
          <Line error tiny mt={1}>
            {showScopeError.value}
          </Line>
        </FlexBox>

        <FlexBox fullWidth minHeight={'80px'} col>
          <FlexBox gap2 col>
            <FlexBox alignBase gap1>
              Custom domain
            </FlexBox>
            <TextField
              id="gitlab-custom-domain"
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
            />
          </FlexBox>
          <Line error tiny mt={1} minHeight={'18px'}>
            {showDomainError.value}
          </Line>
          <FlexBox>
            <Line tiny mt={1} primary sx={{ cursor: 'pointer' }}>
              <Link
                href="https://gitlab.com/-/user_settings/personal_access_tokens"
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

        <FlexBox justifyBetween alignCenter mt={'auto'}>
          <FlexBox col sx={{ opacity: 0.8 }}>
            <Line>Learn more about Gitlab</Line>
            <Line>
              Personal Access Token (PAT)
              <Link
                ml={1 / 2}
                href="https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html"
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
      border: `2px solid ${alpha('rgb(256,0,0)', 0.6)}`,
      transition: 'all 0.8s ease',
      borderRadius: '8px',
      opacity: 1,
      width: '126px',
      position: 'absolute',
      maxWidth: 'calc(100% - 48px)',
      left: '12px'
    };

    return [
      {
        height: '32px',
        top: '298px'
      },
      {
        height: '32px',
        top: '360px'
      },
      {
        height: '32px',
        top: '425px'
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
          maxHeight: '976px',
          overflowY: 'auto',
          transition: 'all 0.8s ease',
          position: 'relative',
          maxWidth: '100%',
          background: '#000000'
        }}
      >
        <Image
          onLoadingComplete={imageLoaded.true}
          style={{
            position: 'relative',
            transition: 'all 0.8s ease',
            opacity: !imageLoaded.value ? 0 : 1,
            filter: 'invert(1)'
          }}
          src="/assets/gitlabPAT.png"
          width={816}
          height={976}
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
