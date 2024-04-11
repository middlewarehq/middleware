import {
  IconButton,
  IconButtonProps,
  MenuList,
  styled,
  SwitchProps,
  useTheme,
  alpha,
  Tooltip,
  TooltipProps,
  tooltipClasses,
  darken,
  Switch
} from '@mui/material';
import { FC, forwardRef } from 'react';

export const MenuListWrapperSecondary = styled(MenuList)(
  ({ theme }) => `
  padding: ${theme.spacing(3)};
  display: flex;
  flex-direction: column;

  & .MuiMenuItem-root {
      border-radius: ${theme.spacing(1)};
      padding: ${theme.spacing(1, 1, 1, 2.5)};
      min-width: 200px;
      margin-bottom: 2px;
      position: relative;
      color: ${theme.colors.alpha.black[70]};

      &.Mui-selected,
      &:hover,
      &.MuiButtonBase-root:active {
          background: ${theme.colors.alpha.black[10]};
          color: ${theme.colors.alpha.black[100]};
      }

      &:last-child {
          margin-bottom: 0;
      }
    }
`
);

export const LightTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip
    {...props}
    title={!props.title ? '' : props.title}
    classes={{ popper: className }}
  />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: theme.colors.alpha.trueWhite[100],
    color: theme.palette.getContrastText(theme.colors.alpha.trueWhite[100]),
    fontWeight: 500,
    fontSize: theme.typography.pxToRem(12),
    borderRadius: '5px',
    maxWidth: '400px'
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: theme.colors.alpha.trueWhite[100]
  }
}));

export const DarkTooltip = styled(({ className, ...props }: TooltipProps) => (
  <Tooltip
    {...props}
    title={!props.title ? '' : props.title}
    classes={{ popper: className }}
  />
))(({ theme }) => ({
  [`& .${tooltipClasses.tooltip}`]: {
    backgroundColor: alpha(darken(theme.colors.primary.main, 0.75), 0.85),
    color: theme.palette.getContrastText(
      darken(theme.colors.primary.main, 0.8)
    ),
    backdropFilter: `blur(4px)`,
    fontWeight: 'normal',
    fontSize: theme.typography.pxToRem(12),
    borderRadius: '5px',
    maxWidth: '400px'
  },
  [`& .${tooltipClasses.arrow}`]: {
    color: alpha(darken(theme.colors.primary.main, 0.75), 0.85),
    backdropFilter: 'inherit'
  }
}));

export const VisibleIconBtn: FC<IconButtonProps> = forwardRef(
  ({ color = 'secondary', ...props }, ref) => {
    const theme = useTheme();

    return (
      <IconButton
        ref={ref}
        sx={{
          background: alpha(
            (
              theme.colors[color as keyof (typeof theme)['colors']] as {
                main: string;
              }
            ).main,
            0.15
          ),
          color: alpha(
            (
              theme.colors[color as keyof (typeof theme)['colors']] as {
                main: string;
              }
            ).main,
            0.85
          ),
          transition: `${theme.transitions.create(['all'])}`,

          '&:hover': {
            background: alpha(
              (
                theme.colors[color as keyof (typeof theme)['colors']] as {
                  main: string;
                }
              ).main,
              0.3
            ),
            color: (
              theme.colors[color as keyof (typeof theme)['colors']] as {
                main: string;
              }
            ).main
          },
          ...props.sx
        }}
        {...props}
      >
        {props.children}
      </IconButton>
    );
  }
);

export const MiniSwitch = styled((props: SwitchProps) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
  width: 32,
  height: 16,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '200ms',
    '&.Mui-checked': {
      transform: 'translateX(16px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: theme.colors.primary.dark,
        opacity: 1,
        border: 0
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5
      }
    },
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      color: theme.colors.primary.main,
      border: '6px solid white'
    },
    '&.Mui-disabled .MuiSwitch-thumb': {
      color: theme.colors.secondary.light
    },
    '&.Mui-disabled + .MuiSwitch-track': {
      opacity: 0.3
    }
  },
  '& .MuiSwitch-thumb': {
    boxSizing: 'border-box',
    width: 12,
    height: 12
  },
  '& .MuiSwitch-track': {
    borderRadius: 16 / 2,
    backgroundColor: theme.colors.secondary.light,
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 250
    })
  }
}));
