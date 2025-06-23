import { LoadingButton } from '@mui/lab';
import {
  Divider,
  Link,
  TextField,
  alpha,
  ToggleButton,
  ToggleButtonGroup
} from '@mui/material';
import Image from 'next/image';
import { useSnackbar } from 'notistack';
import { FC, useCallback, useMemo } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { Integration } from '@/constants/integrations';
import { ClassicStyles, FineGrainedStyles } from '@/constants/style';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { fetchCurrentOrg } from '@/slices/auth';
import { fetchTeams } from '@/slices/team';
import { useDispatch } from '@/store';
import { GithubTokenType } from '@/types/resources';
import {
  checkGitHubValidity,
  linkProvider,
  getMissingPATScopes,
  getMissingFineGrainedScopes,
  getTokenType
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
  const tokenType = useEasyState<GithubTokenType>(GithubTokenType.CLASSIC);
  const isTokenValid = useBoolState(false);

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
    const detectedType = getTokenType(e);

    if (detectedType === 'unknown') {
      setError('Invalid token format');
      isTokenValid.false();
    } else if (detectedType !== tokenType.value) {
      setError(
        `Token format doesn't match selected type. Expected ${tokenType.value} token.`
      );
      isTokenValid.false();
    } else {
      showError.set('');
      isTokenValid.true();
    }
  };

  const handleDomainChange = (e: string) => {
    customDomain.set(e);
    showDomainError.set('');
  };

  const handleTokenTypeChange = (value: GithubTokenType) => {
    tokenType.set(value);
    token.set(''); // Reset token when switching token types
    showError.set('');
    isTokenValid.false();
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

      const missingScopes =
        tokenType.value === GithubTokenType.CLASSIC
          ? await getMissingPATScopes(
              token.value,
              customDomain.valueRef.current
            )
          : await getMissingFineGrainedScopes(
              token.value,
              customDomain.valueRef.current
            );

      if (missingScopes.length > 0) {
        setError(`Token is missing scopes: ${missingScopes.join(', ')}`);
        return;
      }

      await linkProvider(token.value, orgId, Integration.GITHUB, {
        custom_domain: customDomain.valueRef.current,
        token_type: tokenType.value
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
    tokenType.value,
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
      document.getElementById('github-custom-domain')?.focus();
  }, [customDomain.value]);

  return (
    <FlexBox gap2>
      <FlexBox gap={2} minWidth={'400px'} col>
        <FlexBox>Enter your Github token below.</FlexBox>
        <FlexBox fullWidth minHeight={'80px'} col>
          <ToggleButtonGroup
            value={tokenType.value}
            exclusive
            onChange={(_, value) => value && handleTokenTypeChange(value)}
            sx={{ mb: 2 }}
          >
            <ToggleButton value={GithubTokenType.CLASSIC}>
              Classic Token
            </ToggleButton>
            <ToggleButton value={GithubTokenType.FINE_GRAINED}>
              Fine Grained Token
            </ToggleButton>
          </ToggleButtonGroup>
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
            label={`Github ${
              tokenType.value === GithubTokenType.CLASSIC
                ? 'Personal Access Token'
                : 'Fine Grained Token'
            }`}
            type="password"
          />
          <Line error tiny mt={1}>
            {showError.value}
          </Line>
          <FlexBox>
            <Line tiny mt={1} primary sx={{ cursor: 'pointer' }}>
              <Link
                href={
                  tokenType.value === GithubTokenType.CLASSIC
                    ? 'https://github.com/settings/tokens'
                    : 'https://github.com/settings/tokens?type=beta'
                }
                target="_blank"
                rel="noopener noreferrer"
              >
                <Line
                  underline
                  sx={{
                    textUnderlineOffset: '2px'
                  }}
                >
                  Generate new{' '}
                  {tokenType.value === GithubTokenType.CLASSIC
                    ? 'classic'
                    : 'fine-grained'}{' '}
                  token
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
              {tokenType.value === GithubTokenType.CLASSIC
                ? 'Personal Access Token (PAT)'
                : 'Fine Grained Token (FGT)'}
              <Link
                ml={1 / 2}
                href={
                  tokenType.value === GithubTokenType.CLASSIC
                    ? 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens'
                    : 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens#fine-grained-personal-access-tokens'
                }
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
              disabled={!isTokenValid.value}
              variant="contained"
              onClick={handleSubmission}
            >
              Confirm
            </LoadingButton>
          </FlexBox>
        </FlexBox>
      </FlexBox>
      <Divider orientation="vertical" flexItem />
      <TokenPermissions tokenType={tokenType.value} />
    </FlexBox>
  );
};

const TokenPermissions: FC<{ tokenType: GithubTokenType }> = ({
  tokenType
}) => {
  const imageLoaded = useBoolState(false);

  const expandedStyles = useMemo(() => {
    const baseStyles = {
      border: `2px solid ${alpha('rgb(256,0,0)', 0.4)}`,
      transition: 'all 0.8s ease',
      borderRadius: '12px',
      opacity: 1,
      width: tokenType === GithubTokenType.CLASSIC ? '250px' : '790px',
      position: 'absolute',
      maxWidth: 'calc(100% - 48px)',
      left: '24px'
    };

    const styles =
      tokenType === GithubTokenType.CLASSIC ? ClassicStyles : FineGrainedStyles;
    return styles.map((style) => ({ ...style, ...baseStyles }));
  }, [tokenType]);

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
          src={
            tokenType === GithubTokenType.CLASSIC
              ? '/assets/PAT_permissions.png'
              : '/assets/FST_permissions.png'
          }
          width={816}
          height={tokenType === GithubTokenType.CLASSIC ? 1257 : 3583}
          alt={
            tokenType === GithubTokenType.CLASSIC
              ? 'PAT_permissions'
              : 'FST_permissions'
          }
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
