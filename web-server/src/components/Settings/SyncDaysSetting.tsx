import { FlexBox } from '../FlexBox';
import { Box, Button, Divider, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Line } from '../Text';
import { FC, useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from '@/store';
import {
  getDefaultSyncDaysSettings,
  updateDefaultSyncDaysSettings
} from '@/slices/org';
import { FetchState } from '@/constants/ui-states';
import { useEasyState } from '@/hooks/useEasyState';
import { depFn } from '@/utils/fn';

const MAXIMUM_SYNC_DAYS = 366;

export const SyncDaysSetting: FC = () => {
  const dispatch = useDispatch();
  const { orgId } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const initialSyncDays = useSelector((state) => state.org.defaultSyncDays);
  const syncDays = useEasyState<number>(null);
  const [error, setError] = useState('');
  const isSaving = useSelector(
    (s) => s.org.requests?.defaultSyncDays === FetchState.REQUEST
  );

  const handleDiscard = () => {
    syncDays.set(initialSyncDays);
    setError('');
  };

  const handleSave = useCallback(async () => {
    const res = await dispatch(
      updateDefaultSyncDaysSettings({
        orgId,
        defaultSyncDays: syncDays.value
      })
    );
    if (res.meta.requestStatus === 'rejected') {
      handleDiscard();
      return enqueueSnackbar('Default sync days update failed', {
        variant: 'error',
        autoHideDuration: 2000
      });
    }
    enqueueSnackbar(
      'Default sync days updated successfully. The data will be synced shortly.',
      {
        variant: 'success',
        autoHideDuration: 3000
      }
    );
  }, [
    syncDays.value,
    initialSyncDays,
    dispatch,
    orgId,
    enqueueSnackbar,
    handleDiscard
  ]);

  useEffect(() => {
    if (!orgId) return;
    dispatch(getDefaultSyncDaysSettings({ orgId }));
  }, [orgId, dispatch]);

  useEffect(() => {
    depFn(syncDays.set, initialSyncDays);
  }, [syncDays.set, initialSyncDays]);

  return (
    <FlexBox col gap2>
      <Line bold white fontSize="20px">
        Organization Settings
      </Line>

      <Divider />
      {syncDays.value !== null && (
        <>
          <FlexBox gap1 alignCenter justifyBetween>
            <FlexBox col flexGrow={1}>
              <Line big bold>
                Sync Days
              </Line>
              <Box>
                Select how many days of past data to load; more days may
                increase sync time.
              </Box>
            </FlexBox>

            <FlexBox alignCenter>
              <TextField
                value={syncDays.value}
                onChange={(e) => {
                  const days = Number(e.target.value);
                  if (isNaN(days)) return;
                  if (days < initialSyncDays)
                    setError('Less than current sync days not allowed');
                  else if (days > MAXIMUM_SYNC_DAYS)
                    setError(
                      `Sync days cannot be more than ${MAXIMUM_SYNC_DAYS}`
                    );
                  else setError('');
                  syncDays.set(days);
                }}
                placeholder="Default sync days"
                sx={{ minWidth: '240px' }}
                autoComplete="off"
                error={Boolean(error)}
                label={error}
              />
            </FlexBox>
          </FlexBox>
          <FlexBox
            sx={{
              justifyContent: 'flex-end',
              marginTop: '16px'
            }}
            gap2
          >
            <Button
              variant="outlined"
              disabled={isSaving}
              sx={{
                '&.Mui-disabled': {
                  borderColor: 'secondary.light'
                },
                width: '160px'
              }}
              onClick={handleDiscard}
            >
              Discard
            </Button>
            <LoadingButton
              type="submit"
              variant="outlined"
              color="primary"
              loading={isSaving}
              disabled={syncDays.value === initialSyncDays || Boolean(error)}
              sx={{
                '&.Mui-disabled': {
                  borderColor: 'secondary.light'
                },
                width: '160px'
              }}
              onClick={handleSave}
            >
              Save
            </LoadingButton>
          </FlexBox>
        </>
      )}
    </FlexBox>
  );
};
