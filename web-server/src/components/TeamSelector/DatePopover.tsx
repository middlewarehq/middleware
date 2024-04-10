import {
  alpha,
  Box,
  Divider,
  Popover,
  Stack,
  Typography,
  useTheme
} from '@mui/material';
import { FC, MutableRefObject } from 'react';

import { BoolState } from '@/hooks/useEasyState';

import { defaultPopoverProps } from './defaultPopoverProps';
import { useTeamSelectorSetup } from './useTeamSelectorSetup';

import { DateRangePicker } from '../DateRangePicker';

export const DatePopover: FC<
  {
    dateElRef: MutableRefObject<any>;
    datesPop: BoolState;
  } & Pick<ReturnType<typeof useTeamSelectorSetup>, 'dateRange' | 'setRange'>
> = ({ dateElRef, datesPop, dateRange, setRange }) => {
  const theme = useTheme();

  return (
    <Popover
      anchorEl={dateElRef.current}
      onClose={datesPop.false}
      open={datesPop.value}
      {...defaultPopoverProps}
    >
      <Box
        sx={{
          p: 2,
          background: alpha(theme.colors.alpha.black[100], 0.06)
        }}
        display="flex"
        alignItems="center"
        justifyContent="space-between"
      >
        <Box>
          <Typography sx={{ pb: 0.5 }} variant="h4">
            Select Date Range
          </Typography>
          <Typography noWrap variant="subtitle2">
            Data will be presented within this range
          </Typography>
        </Box>
      </Box>
      <Divider />
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        divider={<Divider orientation="vertical" flexItem />}
        justifyContent="stretch"
        alignItems="stretch"
        spacing={0}
      >
        <DateRangePicker
          range={dateRange}
          setRange={setRange}
          onClose={datesPop.false}
        />
      </Stack>
    </Popover>
  );
};
