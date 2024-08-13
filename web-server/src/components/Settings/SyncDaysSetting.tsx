import { FlexBox } from '../FlexBox';
import { Box, Button, Divider, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Line } from '../Text';
import { FC, useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from '@/store';
import {
  getDefaultSyncDaysSettings,
  updateDefaultSyncDaysSettings
} from '@/slices/org';
import { FetchState } from '@/constants/ui-states';

export const SyncDaysSetting: FC = () => {
  const dispatch = useDispatch();
  const { orgId } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const initialSyncDays = useSelector((state) => state.org.defaultSyncDays);
  const [syncDays, setSyncDays] = useState<number>(initialSyncDays);
  const isSaving = useSelector(
    (s) => s.org.requests?.defaultSyncDays === FetchState.REQUEST
  );
  const [error, setError] = useState('');

  const getSyncDays = async (): Promise<number> => {
    const res = await dispatch(getDefaultSyncDaysSettings({ orgId }));
    return res.payload as number;
  };

  const updateSyncDays = async (days: number): Promise<number> => {
    const res = await dispatch(
      updateDefaultSyncDaysSettings({ orgId, defaultSyncDays: days })
    );
    return res.payload as number;
  };

  const handleDiscard = () => {
    setSyncDays(initialSyncDays);
    setError('');
  };

  const handleSave = async () => {
    try {
      await updateSyncDays(syncDays);
      enqueueSnackbar('Default Sync Days Updated Successfully', {
        variant: 'success',
        autoHideDuration: 3000
      });
    } catch (e) {
      handleDiscard();
      return enqueueSnackbar('Default Sync Days Update Failed', {
        variant: 'error',
        autoHideDuration: 2000
      });
    }
  };

  useEffect(() => {
    if (!orgId) return;
    getSyncDays().then((d) => setSyncDays(d));
  }, []);

  return (
    <FlexBox col gap2>
      <FlexBox big bold gap1 component={Line} white sx={{ fontSize: '20px' }}>
        Organization Settings
      </FlexBox>

      <Divider />
      {initialSyncDays && (
        <>
          <FlexBox gap1 alignCenter justifyBetween>
            <FlexBox col flexGrow={1}>
              <Line big bold>
                Sync Days
              </Line>
              <Box>
                The setting to control how many days of past data should be
                included.
              </Box>
            </FlexBox>

            <FlexBox alignCenter>
              <TextField
                value={syncDays}
                onChange={(e) => {
                  const days = Number(e.target.value);
                  if (isNaN(days)) setError('Sync days is Not a number');
                  else if (days < initialSyncDays)
                    setError('Less than Current Sync Days not allowed');
                  else if (days > 366)
                    setError('Sync days cannot be more than 366');
                  else setError('');
                  setSyncDays(days);
                }}
                placeholder="default sync days"
                sx={{ minWidth: '240px' }}
                autoComplete="off"
                error={!!error}
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
            <LoadingButton
              type="submit"
              variant="outlined"
              color="primary"
              loading={isSaving}
              disabled={syncDays == initialSyncDays || !!error}
              sx={{
                '&.Mui-disabled': {
                  borderColor: 'secondary.light'
                },
                width: '160px'
              }}
              onMouseDown={handleSave}
            >
              SAVE
            </LoadingButton>
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
              DISCARD
            </Button>
          </FlexBox>
        </>
      )}
    </FlexBox>
  );
};
