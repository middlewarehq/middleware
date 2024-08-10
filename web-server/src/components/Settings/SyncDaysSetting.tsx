import { FlexBox } from '../FlexBox';
import { Box, Divider, TextField } from '@mui/material';
import { LoadingButton } from '@mui/lab';
import { Line } from '../Text';
import DoneIcon from '@mui/icons-material/Done';
import { FC, useEffect, useState } from 'react';
import { handleApi } from '@/api-helpers/axios-api-instance';
import { useAuth } from '@/hooks/useAuth';
import { OrgResetBookmarkApiResponse } from '@/types/resources';
import { useBoolState } from '@/hooks/useEasyState';
import { useSnackbar } from 'notistack';
import { useDispatch, useSelector } from '@/store';
import {
  getDefaultSyncDaysSettings,
  updateDefaultSyncDaysSettings
} from '@/slices/org';

export const SyncDaysSetting: FC = () => {
  const dispatch = useDispatch();
  const inputFocus = useBoolState(false);
  const isSaving = useBoolState(false);
  const [syncDays, setSyncDays] = useState<number>(31);
  const { orgId } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const initialSyncDays = useSelector((state) => state.org.defaultSyncDays);

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

  const handleSave = async () => {
    isSaving.true();
    const fallbackSyncDays = initialSyncDays;
    try {
      await updateSyncDays(syncDays);
      handleApi<OrgResetBookmarkApiResponse>(`/internal/${orgId}/bookmarks`, {
        method: 'PUT'
      })
        .then(() => {
          enqueueSnackbar('Default Sync Days Updated Successfully', {
            variant: 'success',
            autoHideDuration: 3000
          });
        })
        .catch(() => {
          updateSyncDays(fallbackSyncDays);
          setSyncDays(fallbackSyncDays);
        });
    } catch (e) {
      setSyncDays(fallbackSyncDays);
      return enqueueSnackbar('Default Sync Days Update Failed', {
        variant: 'error',
        autoHideDuration: 2000
      });
    } finally {
      inputFocus.false();
      isSaving.false();
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
                if (!isNaN(days)) setSyncDays(days);
              }}
              onFocus={() => {
                inputFocus.true();
              }}
              onBlur={() => {
                if (!isSaving.value) {
                  inputFocus.false();
                  if(syncDays !== initialSyncDays) setSyncDays(initialSyncDays);
                }
              }}
              placeholder="default sync days"
              sx={{ width: '240px', minWidth: '240px' }}
              autoComplete="off"
            />
            {inputFocus.value && (
              <LoadingButton
                type="submit"
                variant="outlined"
                color="primary"
                loading={isSaving.value}
                sx={{
                  '&.Mui-disabled': {
                    borderColor: 'secondary.light'
                  },
                  width: '48px',
                  height: '48px',
                  marginLeft: '8px'
                }}
                onMouseDown={handleSave}
              >
                <DoneIcon />
              </LoadingButton>
            )}
          </FlexBox>
        </FlexBox>
      )}
    </FlexBox>
  );
};
