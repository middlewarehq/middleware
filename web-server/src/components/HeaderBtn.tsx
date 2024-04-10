import { LoadingButton, LoadingButtonProps } from '@mui/lab';
import { useTheme } from '@mui/material';
import { forwardRef } from 'react';

export const HeaderBtn = forwardRef((props: LoadingButtonProps, ref: any) => {
  const theme = useTheme();

  return (
    <LoadingButton
      {...props}
      ref={ref}
      color="secondary"
      size="small"
      sx={{
        fontWeight: 500,
        px: 2,
        backgroundColor: theme.colors.secondary.lighter,
        color: theme.colors.secondary.dark,

        '.MuiSvgIcon-root': {
          color: theme.colors.secondary.dark,
          transition: theme.transitions.create(['color'])
        },

        '&:hover': {
          backgroundColor: theme.colors.secondary.main,
          color: theme.palette.getContrastText(theme.colors.secondary.main),

          '.MuiSvgIcon-root': {
            color: theme.palette.getContrastText(theme.colors.secondary.main)
          }
        },

        ...props.sx
      }}
    />
  );
});
