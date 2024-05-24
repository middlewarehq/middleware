import CheckIcon from '@mui/icons-material/Check';
import TuneIcon from '@mui/icons-material/Tune';
import { Box, Button, Divider, Popover, useTheme } from '@mui/material';
import { useCallback, useMemo, useRef } from 'react';

import { Line } from '@/components/Text';
import { useBoolState } from '@/hooks/useEasyState';
import { appSlice, DEFAULT_PR_TABLE_COLUMN_STATE_MAP } from '@/slices/app';
import { useDispatch, useSelector } from '@/store';
import { merge } from '@/utils/datatype';

import { FlexBox } from '../FlexBox';

const formatColumnName = (
  name: keyof typeof DEFAULT_PR_TABLE_COLUMN_STATE_MAP
) => name.split('_').join(' ');

export const PullRequestTableColumnSelector = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const elRef = useRef(null);
  const isPopoverOpen = useBoolState(false);
  const prTableColumnStateConfig = useSelector(
    (s) => s.app.prTableColumnsConfig || DEFAULT_PR_TABLE_COLUMN_STATE_MAP
  );
  const prTableColumnConfig = useMemo(
    () => merge(DEFAULT_PR_TABLE_COLUMN_STATE_MAP, prTableColumnStateConfig),
    [prTableColumnStateConfig]
  );

  const handleColumnToggle = useCallback(
    (columnName: keyof typeof prTableColumnConfig) => {
      const updatedColumns = { ...prTableColumnConfig };
      updatedColumns[columnName] = !updatedColumns[columnName];
      dispatch(appSlice.actions.setPrTableColumnConfig(updatedColumns));
    },
    [dispatch, prTableColumnConfig]
  );

  return (
    <>
      <Button
        ref={elRef}
        sx={{
          maxWidth: 'fit-content',
          border: `1px solid ${theme.colors.secondary.light}`
        }}
        onClick={isPopoverOpen.toggle}
      >
        <Line bigish white>
          <FlexBox gap1 alignCenter>
            <TuneIcon fontSize="inherit" />
            Configure columns
          </FlexBox>
        </Line>
      </Button>
      <Popover
        open={isPopoverOpen.value}
        anchorEl={elRef.current}
        onClose={isPopoverOpen.false}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right'
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right'
        }}
      >
        <FlexBox col>
          <FlexBox col gap={1 / 2} p={1}>
            <Line bigish bold px={3}>
              Configure columns
            </Line>
          </FlexBox>
          <Divider />
          <FlexBox p={1} col gap={1 / 2}>
            {Object.entries(prTableColumnConfig)?.map(
              ([columnName, isEnabled], idx) => {
                return (
                  <FlexBox
                    alignCenter
                    gap1
                    key={idx}
                    sx={{
                      padding: theme.spacing(1 / 4),
                      textTransform: 'capitalize',
                      borderRadius: theme.spacing(1 / 2),
                      transition: 'background-color 0.2s',
                      cursor: 'pointer',
                      '&:hover': {
                        backgroundColor: theme.colors.secondary.light
                      }
                    }}
                    onClick={() =>
                      handleColumnToggle(
                        columnName as keyof typeof prTableColumnConfig
                      )
                    }
                  >
                    <Box mb="-6px" minWidth="20px">
                      {isEnabled && <CheckIcon fontSize="inherit" />}
                    </Box>
                    <Line bigish>
                      {formatColumnName(
                        columnName as keyof typeof DEFAULT_PR_TABLE_COLUMN_STATE_MAP
                      )}
                    </Line>
                  </FlexBox>
                );
              }
            )}
          </FlexBox>
        </FlexBox>
      </Popover>
    </>
  );
};
