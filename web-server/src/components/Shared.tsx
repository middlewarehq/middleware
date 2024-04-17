import {
  Box,
  CardActionArea,
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
import { BarTooltipProps } from '@nivo/bar';
import { Point } from '@nivo/line';
import { sum } from 'ramda';
import { FC, forwardRef } from 'react';

import { getDurationString } from '@/utils/date';

import { FlexBox } from './FlexBox';
import { Line } from './Text';

export const LabelWrapper = styled(Box)(
  ({ theme }) => `
  font-size: ${theme.typography.pxToRem(10)};
  font-weight: bold;
  text-transform: uppercase;
  border-radius: ${theme.general.borderRadiusSm};
  padding: ${theme.spacing(0.5, 1, 0.4)};
`
);

export const CardActionAreaWrapper = styled(CardActionArea)(
  ({ theme }) => `
      .MuiTouchRipple-root {
        opacity: .2;
      }

      .MuiCardActionArea-focusHighlight {
        background: ${theme.colors.primary.main};
      }

      &:hover {
        .MuiCardActionArea-focusHighlight {
          opacity: .05;
        }
      }
`
);

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

export const MenuListWrapperSuccess = styled(MenuList)(
  ({ theme }) => `
  padding: ${theme.spacing(3)};

  & .MuiMenuItem-root {
      border-radius: 50px;
      padding: ${theme.spacing(1, 1, 1, 2.5)};
      min-width: 200px;
      margin-bottom: 2px;
      position: relative;
      color: ${theme.colors.success.main};

      &.Mui-selected,
      &:hover,
      &.MuiButtonBase-root:active {
          background: ${theme.colors.success.lighter};
          color: ${theme.colors.success.dark};
      }

      &:last-child {
          margin-bottom: 0;
      }
    }
`
);

export const MenuListWrapperError = styled(MenuList)(
  ({ theme }) => `
  padding: ${theme.spacing(3)};

  & .MuiMenuItem-root {
      border-radius: 50px;
      padding: ${theme.spacing(1, 1, 1, 2.5)};
      min-width: 200px;
      margin-bottom: 2px;
      position: relative;
      color: ${theme.colors.error.main};

      &.Mui-selected,
      &:hover,
      &.MuiButtonBase-root:active {
          background: ${theme.colors.error.lighter};
          color: ${theme.colors.error.dark};
      }

      &:last-child {
          margin-bottom: 0;
      }
    }
`
);

export const DotLegend = styled('span')(
  ({ theme }) => `
    border-radius: 22px;
    width: ${theme.spacing(1.4)};
    height: ${theme.spacing(1.45)};
    display: inline-block;
    border: ${theme.colors.alpha.white[100]} solid 2px;
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

export const IOSSwitch = styled((props: SwitchProps) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(({ theme }) => ({
  width: 42,
  height: 26,
  padding: 0,
  '& .MuiSwitch-switchBase': {
    padding: 0,
    margin: 2,
    transitionDuration: '200ms',
    '&.Mui-checked': {
      transform: 'translateX(16px)',
      color: '#fff',
      '& + .MuiSwitch-track': {
        backgroundColor: theme.colors.success.dark,
        opacity: 1,
        border: 0
      },
      '&.Mui-disabled + .MuiSwitch-track': {
        opacity: 0.5
      }
    },
    '&.Mui-focusVisible .MuiSwitch-thumb': {
      color: theme.colors.success.main,
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
    width: 22,
    height: 22
  },
  '& .MuiSwitch-track': {
    borderRadius: 26 / 2,
    backgroundColor: theme.colors.secondary.light,
    opacity: 1,
    transition: theme.transitions.create(['background-color'], {
      duration: 300
    })
  }
}));

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

export const PointTooltip: FC<{
  datasetName: string | number;
  value: string | number;
  color: string;
}> = ({ datasetName, value, color }) => {
  return (
    <FlexBox gap1 alignCenter>
      <Box width="10px" height="10px" sx={{ backgroundColor: color }} />
      <Line medium>
        {datasetName} : {value}
      </Line>
    </FlexBox>
  );
};

export const SliceTooltip: FC<{
  points: Point[];
  showTotalTime?: boolean;
}> = ({ points, showTotalTime }) => {
  const theme = useTheme();
  const totalTime = sum(points.map((p) => Number(p.data.y)));
  return (
    <FlexBox
      col
      gap1
      p={1}
      sx={{
        color: 'white',
        borderRadius: theme.spacing(1),
        background: 'rgba(0, 0, 0, 0.9)',
        zIndex: 1000
      }}
    >
      <Line bold bigish>
        {points[0].data.xFormatted}
        {showTotalTime && ` | Total Time : ${getDurationString(totalTime)}`}
      </Line>
      <FlexBox col gap={1 / 2}>
        {points.map((point, idx) => (
          <PointTooltip
            key={idx}
            color={point.color}
            datasetName={point.serieId}
            value={point.data.yFormatted}
          />
        ))}
      </FlexBox>
    </FlexBox>
  );
};

export const BarChartTooltip: FC<{
  point: BarTooltipProps<any>;
  datesetFormatter: (datasetName: string) => string;
  valueFormatter: (value: number) => string;
}> = ({ point, datesetFormatter, valueFormatter }) => {
  const theme = useTheme();
  return (
    <FlexBox
      col
      gap1
      p={1}
      sx={{
        color: 'white',
        borderRadius: theme.spacing(1),
        background: 'rgba(0, 0, 0, 0.9)',
        zIndex: 1000
      }}
    >
      <Line bold bigish>
        {point.indexValue}
      </Line>
      <FlexBox col gap={1 / 2}>
        <PointTooltip
          color={point.color}
          datasetName={datesetFormatter(point.id.toString())}
          value={valueFormatter(Number(point.formattedValue))}
        />
      </FlexBox>
    </FlexBox>
  );
};
