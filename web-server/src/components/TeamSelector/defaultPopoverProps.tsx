import { PopoverProps } from '@mui/material';

export const defaultPopoverProps: Partial<PopoverProps> = {
  disableScrollLock: true,
  anchorOrigin: {
    vertical: 'top',
    horizontal: 'left'
  },
  transformOrigin: {
    vertical: 'top',
    horizontal: 'left'
  }
};
