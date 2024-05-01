import { LoadingButton } from '@mui/lab';
import { Divider, Link, SxProps, TextField, alpha } from '@mui/material';
import Image from 'next/image';
import { useSnackbar } from 'notistack';
import { FC, useCallback, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { Integration } from '@/constants/integrations';
import { useModal } from '@/contexts/ModalContext';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { fetchCurrentOrg } from '@/slices/auth';
import {
  unlinkProvider,
  checkGitHubValidity,
  linkProvider,
  getMissingPATScopes
} from '@/utils/auth';
import { depFn } from '@/utils/fn';

export const useIntegrationHandlers = () => {
  const { orgId } = useAuth();

  const { addModal, closeAllModals } = useModal();

  return useMemo(() => {
    const handlers = {
      link: {
        github: () =>
          addModal({
            title: 'Configure Github',
            body: <ConfigureGithubModalBody onClose={closeAllModals} />,
            showCloseIcon: true
          })
      },
      unlink: {
        github: () => unlinkProvider(orgId, Integration.GITHUB)
      }
    };

    return handlers;
  }, [addModal, closeAllModals, orgId]);
};

const ConfigureGithubModalBody: FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const token = useEasyState('');
  const { orgId } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const isLoading = useBoolState();

  const showError = useEasyState<string>('');

  const setError = (error: string) => {
    console.error(error);
    showError.set(error);
  };

  const removeError = () => {
    showError.set('');
  };

  const handleChange = (e: string) => {
    token.set(e);
    removeError();
  };

  return (
    <FlexBox gap2>
      <FlexBox gap={2} minWidth={'400px'} maxHeight={'255px'} col>
        <FlexBox>Enter you Github token below.</FlexBox>
        <FlexBox fullWidth minHeight={'80px'} col>
          <TextField
            error={!!showError.value}
            sx={{ width: '100%' }}
            value={token.value}
            onChange={(e) => {
              handleChange(e.currentTarget.value);
            }}
            label="Github Personal Access Token"
          />
          <Line error tiny mt={1}>
            {showError.value}
          </Line>
          <Line tiny mt={1}>
            <Link
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noopener noreferrer"
            >
              Generate new classic token
            </Link>
          </Line>
        </FlexBox>

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
              onClick={() => {
                if (!token.value) {
                  setError('Please enter a valid token');
                  return;
                }
                isLoading.true();
                checkGitHubValidity(token.value)
                  .then(async (isValid) => {
                    if (!isValid) throw new Error('Invalid token');
                  })
                  .then(async () => {
                    try {
                      const res = await getMissingPATScopes(token.value);
                      if (res.length) {
                        throw new Error(
                          `Token is missing scopes: ${res.join(', ')}`
                        );
                      }
                    } catch (e) {
                      // @ts-ignore
                      throw new Error(e?.message, e);
                    }
                  })
                  .then(async () => {
                    try {
                      return await linkProvider(
                        token.value,
                        orgId,
                        Integration.GITHUB
                      );
                    } catch (e) {
                      throw new Error('Failed to link Github: ', e);
                    }
                  })
                  .then(() => {
                    dispatch(fetchCurrentOrg());
                    enqueueSnackbar('Github linked successfully', {
                      variant: 'success',
                      autoHideDuration: 2000
                    });
                    onClose();
                  })
                  .catch((e) => {
                    setError(e);
                    console.error('Error while linking token: ', e.message);
                    setError(e.message);
                  })
                  .finally(() => {
                    isLoading.false();
                  });
              }}
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
  const positionArray = ['0px', '130px', '340px', '740px'];
  const position = useEasyState(0);

  const changePosition = useCallback(() => {
    position.set((position.value + 1) % positionArray.length);
  }, [position, positionArray.length]);

  const expand = useBoolState(false);
  const isLoading = useBoolState(false);

  // change position every second
  useEffect(() => {
    if (expand.value) return depFn(position.set, 0);
    const interval = setInterval(changePosition, 2000);
    return () => clearInterval(interval);
  }, [changePosition, expand.value, position.set]);

  const styles: SxProps[] = useMemo(() => {
    const baseStyles = {
      border: `2px solid ${alpha('rgb(256,0,0)', 0.4)}`,
      transition: 'all 0.8s ease',
      borderRadius: '12px',
      opacity: expand.value ? 0 : 1,
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
        top: '98px'
      },
      {
        height: '120px',
        top: '38px'
      },
      {
        height: '120px',
        top: '66px'
      }
    ].map((item) => ({ ...item, ...baseStyles }));
  }, [expand.value]);

  const expandedStyles = useMemo(() => {
    const baseStyles = {
      border: `2px solid ${alpha('rgb(256,0,0)', 0.4)}`,
      transition: 'all 0.8s ease',
      borderRadius: '12px',
      opacity: !expand.value ? 0 : 1,
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
  }, [expand.value]);

  return (
    <FlexBox col gap1 maxWidth={'100%'} overflow={'auto'}>
      <div
        onMouseEnter={expand.true}
        onMouseLeave={expand.false}
        style={{
          overflow: 'hidden',
          borderRadius: '12px',
          height: expand.value ? '1257px' : '240px',
          transition: 'all 0.8s ease',
          position: 'relative',
          maxWidth: '100%'
        }}
      >
        <Image
          onLoadStart={isLoading.true}
          onLoad={isLoading.false}
          style={{
            position: 'relative',
            bottom: expand.value ? 0 : positionArray[position.value],
            transition: 'all 0.8s ease',
            opacity: isLoading.value ? 0 : 1
          }}
          src="/assets/PAT_permissions.png"
          width={816}
          height={1257}
          alt="PAT_permissions"
        />

        <FlexBox sx={styles[position.value]} />

        {expandedStyles.map((style, index) => (
          <FlexBox key={index} sx={style} />
        ))}

        {isLoading.value && (
          <FlexBox
            sx={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)'
            }}
          >
            Loading...
          </FlexBox>
        )}
      </div>
      <Line tiny secondary>
        Hover to expand
      </Line>
    </FlexBox>
  );
};
