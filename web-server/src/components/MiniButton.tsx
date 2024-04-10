import { SvgIconComponent } from '@mui/icons-material';
import { LoadingButton, LoadingButtonProps } from '@mui/lab';
import { FC, forwardRef } from 'react';

export const MiniButton: FC<
  LoadingButtonProps & { Icon?: SvgIconComponent; place?: 'start' | 'end' }
> = forwardRef(({ Icon, place = 'start', loading, ...props }, ref) => {
  return (
    <LoadingButton
      {...props}
      ref={ref}
      loading={loading}
      onClick={props.onClick}
      size="small"
      sx={{
        pr: place === 'end' ? 5 / 4 : 3 / 4,
        pl: 3 / 4,
        py: 0,
        fontSize: 10,
        minWidth: 'unset',
        ...props.sx
      }}
      startIcon={
        Icon &&
        place === 'start' && (
          <Icon
            sx={{ marginRight: -3 / 4, width: '12px' }}
            fontSize="inherit"
          />
        )
      }
      endIcon={
        Icon &&
        place === 'end' && (
          <Icon sx={{ marginLeft: -1 / 2, width: '12px' }} fontSize="inherit" />
        )
      }
    >
      {props.children}
    </LoadingButton>
  );
});
