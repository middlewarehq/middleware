import CheckIcon from '@mui/icons-material/Check';
import TuneIcon from '@mui/icons-material/Tune';
import { Box, Button, Divider, Popover, useTheme } from '@mui/material';
import { omit } from 'ramda';
import { FC, useCallback, useMemo, useRef } from 'react';

import { Line } from '@/components/Text';
import { useBoolState } from '@/hooks/useEasyState';
import { useFeature } from '@/hooks/useFeature';
import { appSlice, DEFAULT_COLUMN_STATE_MAP } from '@/slices/app';
import { useDispatch, useSelector } from '@/store';

import { FlexBox } from '../FlexBox';

const formatColumnName = (name: string) => name.split('_').join(' ');
const JIRA_SPRINT_COLUMNS = ['is_planned'];

export const ColumnsSelector: FC<{ hideJiraSprintColumns: boolean }> = ({
  hideJiraSprintColumns
}) => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const isSprintDetailsColumnEnable = useFeature(
    'enable_sprint_details_column'
  );
  const elRef = useRef(null);
  const isPopoverOpen = useBoolState(false);
  const ticketsTableColumnConfig = useSelector(
    (s) => s.app.ticketsTableColumnConfig || DEFAULT_COLUMN_STATE_MAP
  );
  const filteredTicketsTableColumnConfig = useMemo(() => {
    let columnsToShow = ticketsTableColumnConfig;
    if (!isSprintDetailsColumnEnable) {
      columnsToShow = omit(['sprint_history', 'current_sprint'], columnsToShow);
    }
    if (hideJiraSprintColumns) {
      columnsToShow = omit(JIRA_SPRINT_COLUMNS, columnsToShow);
    }
    return columnsToShow;
  }, [
    hideJiraSprintColumns,
    isSprintDetailsColumnEnable,
    ticketsTableColumnConfig
  ]);

  const handleColumnToggle = useCallback(
    (columnName: keyof typeof ticketsTableColumnConfig) => {
      const updatedColumns = { ...ticketsTableColumnConfig };
      updatedColumns[columnName] = !updatedColumns[columnName];
      dispatch(appSlice.actions.setTicketsTableColumnConfig(updatedColumns));
    },
    [dispatch, ticketsTableColumnConfig]
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
            {Object.entries(filteredTicketsTableColumnConfig)?.map(
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
                        columnName as keyof typeof ticketsTableColumnConfig
                      )
                    }
                  >
                    <Box mb="-6px" minWidth="20px">
                      {isEnabled && <CheckIcon fontSize="inherit" />}
                    </Box>
                    <Line bigish>{formatColumnName(columnName)}</Line>
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
