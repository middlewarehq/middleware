import { LoadingButton } from '@mui/lab';
import { Link, TextField } from '@mui/material';
import { useSnackbar } from 'notistack';
import { FC, useMemo } from 'react';
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
  linkProvider
} from '@/utils/auth';

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
    <FlexBox gap={2} minWidth={'400px'} col>
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
      </FlexBox>

      <FlexBox gap={4} alignCenter justifyBetween>
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
                  if (isValid) {
                    await linkProvider(token.value, orgId, Integration.GITHUB)
                      .then(() => {
                        dispatch(fetchCurrentOrg());
                        enqueueSnackbar('Github linked successfully', {
                          variant: 'success',
                          autoHideDuration: 2000
                        });
                        onClose();
                      })
                      .catch((e) => {
                        setError(
                          'Failed to link token, please try again later'
                        );
                        console.error('Failed to link token', e);
                      });
                  } else {
                    throw new Error('Invalid token');
                  }
                })
                .catch(() => {
                  setError('Invalid token, please check and try again');
                  console.error('Invalid token');
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
  );
};
