import {
  TrendingDownRounded,
  TrendingFlatRounded,
  TrendingUpRounded
} from '@mui/icons-material';
import { useTheme, alpha, darken, lighten } from '@mui/material';
import { format } from 'date-fns';
import { FC, useMemo } from 'react';

import { FlexBox, FlexBoxProps } from '@/components/FlexBox';
import { Line, LineProps } from '@/components/Text';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';
import { roundDecimalPlaces } from '@/utils/array';
import {
  checkForMultiplierBasedComparison,
  merge,
  percentageToMultiplier
} from '@/utils/datatype';
import { getPrevInterval } from '@/utils/date';

const MEANINGFUL_CHANGE_THRESHOLD = 0.5;

const { format: formatNum } = Intl.NumberFormat('en', { notation: 'compact' });

export const DoraMetricsComparisonPill: FC<
  {
    val: number;
    against: number;
    positive?: boolean;
    prevFormat?: (val: number) => string;
    lineProps?: LineProps;
    iconProps?: { fontSize: string };
    backgroundColor?: string;
    boxed?: boolean;
    light?: boolean;
    size?: string | number;
    clamp?: boolean;
    disableDateRange?: boolean;
    isDifferenceBasedChange?: boolean;
    prevStartDate?: Date;
    prevEndDate?: Date;
  } & FlexBoxProps
> = ({
  val,
  against,
  positive = true,
  prevFormat,
  lineProps,
  iconProps,
  boxed,
  size,
  light,
  disableDateRange,
  isDifferenceBasedChange,
  prevStartDate,
  prevEndDate,
  ...props
}) => {
  const theme = useTheme();
  const { dates } = useSingleTeamConfig();
  const [prevCycleStartDate, prevCycleEndDate] = getPrevInterval(
    dates.start,
    dates.end
  );
  const calculatedChange =
    val || against ? Math.round((val / against || 0) * 100 - 100) : 0;
  const useMultiplierBasedComparison =
    !isDifferenceBasedChange &&
    checkForMultiplierBasedComparison(calculatedChange);

  const change = useMemo(() => {
    if (isDifferenceBasedChange)
      return roundDecimalPlaces(val) - roundDecimalPlaces(against);

    const value = useMultiplierBasedComparison
      ? percentageToMultiplier(calculatedChange)
      : calculatedChange;

    if (Math.abs(value) !== Infinity) return value;
    return value > 0 ? 100 : -100;
  }, [
    against,
    calculatedChange,
    isDifferenceBasedChange,
    useMultiplierBasedComparison,
    val
  ]);

  const state =
    change > MEANINGFUL_CHANGE_THRESHOLD
      ? 'positive'
      : change < -MEANINGFUL_CHANGE_THRESHOLD
      ? 'negative'
      : 'neutral';
  const color = darken(
    state === 'positive'
      ? positive
        ? theme.colors.success.main
        : theme.colors.warning.main
      : state === 'negative'
      ? positive
        ? theme.colors.warning.main
        : theme.colors.success.main
      : '#DDD',
    state === 'neutral' ? 0.5 : 0
  );

  const bgColor = light
    ? theme.palette.background.default
    : lighten(color, 0.5);

  const iconFontSize = size || `${iconProps ? iconProps?.fontSize : 'small'}`;
  const icon =
    state === 'positive' ? (
      <TrendingUpRounded fontSize="small" sx={{ fontSize: iconFontSize }} />
    ) : state === 'negative' ? (
      <TrendingDownRounded fontSize="small" sx={{ fontSize: iconFontSize }} />
    ) : (
      <TrendingFlatRounded fontSize="small" sx={{ fontSize: iconFontSize }} />
    );

  return (
    <FlexBox
      color={color}
      title={
        <FlexBox col gap={1 / 2}>
          <Line>
            Previously{' '}
            <Line bold>
              {(prevFormat ? prevFormat(against) : against) || 'same'}
            </Line>
          </Line>
          {!disableDateRange && (
            <Line tiny>
              {format(prevStartDate || prevCycleStartDate, 'do MMM')}
              {' - '}
              {format(prevEndDate || prevCycleEndDate, 'do MMM')}
            </Line>
          )}
        </FlexBox>
      }
      alignCenter
      gap={size ? `calc(${size} / 4)` : 1 / 2}
      fit
      display="inline-flex"
      arrow
      corner="0.5em"
      {...props}
      sx={merge(
        {
          verticalAlign: 'middle',
          transition: 'all 0.2s',
          pointerEvents: 'initial',
          ':hover': {
            boxShadow: `0 0 0 4px ${alpha(color, 0.2)}`
          },
          ...props.sx
        },
        boxed && {
          px: size ? `calc(${size} / 2)` : 1,
          bgcolor: alpha(bgColor, 0.5),
          border: `1px solid ${alpha(color, 0.3)}`
        }
      )}
    >
      {icon}{' '}
      <Line color="inherit" bold fontSize={size} {...lineProps}>
        {formatNum(change)}
        {useMultiplierBasedComparison ? 'x' : '%'}
      </Line>
    </FlexBox>
  );
};
