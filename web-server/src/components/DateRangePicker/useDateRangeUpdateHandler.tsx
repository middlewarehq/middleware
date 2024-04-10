import { Box, Typography } from '@mui/material';
import { subDays, endOfDay, differenceInDays, format } from 'date-fns';
import { useSnackbar } from 'notistack';
import { useCallback } from 'react';

import { DateRange } from './index';

import { DATE_RANGE_MAX_DIFF } from './utils';

export const useDateRangeUpdateHandler = () => {
  const { enqueueSnackbar } = useSnackbar();

  return useCallback(
    (_newRange: DateRange, oldRange: DateRange, onUpdate?: () => any) => {
      const newRange: DateRange = [
        _newRange[0],
        _newRange[1] && endOfDay(_newRange[1])
      ];

      const difference = differenceInDays(newRange[1], newRange[0]);
      if (difference > DATE_RANGE_MAX_DIFF) {
        newRange[0] = subDays(newRange[1], DATE_RANGE_MAX_DIFF);
        enqueueSnackbar(
          <Box>
            <Typography>
              {`The max date range has been restricted to ${DATE_RANGE_MAX_DIFF} days`}
            </Typography>
            <Typography variant="h4" fontSize="small">
              Effective Dates: {format(newRange[0], 'do MMM')} -{' '}
              {format(newRange[1], 'do MMM')}
            </Typography>
          </Box>,
          {
            variant: 'info'
          }
        );
      }
      let updatedRange = oldRange;

      const changed = !oldRange.every((date, i) => {
        return date?.toISOString() === newRange[i]?.toISOString();
      });

      if (!changed) updatedRange = oldRange;
      else {
        updatedRange = newRange;
        onUpdate?.();
      }

      return updatedRange;
    },
    [enqueueSnackbar]
  );
};
