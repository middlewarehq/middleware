import { DatumValue, ValueFormat } from '@nivo/core';
import { ResponsiveLine, Serie, LineProps } from '@nivo/line';
import { format } from 'date-fns';
import { last } from 'ramda';
import { FC, useMemo } from 'react';

import { createTickArray } from '@/utils/array';
import {
  getDurationString,
  getDurationStringWithPlaceholderTxt
} from '@/utils/date';

import { SliceTooltip } from './Shared';
import { Line } from './Text';

const chartTheme = {
  axis: {
    ticks: {
      text: {
        fill: 'white',
        fontSize: 'small'
      }
    },
    domain: {
      line: {
        stroke: 'grey',
        strokeWidth: 2
      }
    }
  },
  crosshair: {
    line: {
      stroke: 'white',
      strokeWidth: 2,
      strokeOpacity: 0.5
    }
  },
  grid: {
    line: {
      stroke: '#d4d3f360',
      strokeWidth: 1,
      strokeDasharray: '5 10'
    }
  }
};

export const formatAsDate = (value: DatumValue) => {
  if (!isDateString(String(value))) return value;
  return format(new Date(value), 'do MMM');
};
function isDateString(str: string) {
  const date = new Date(str);
  return !isNaN(date.getDate());
}
const WEEK_FORMATTING_THRESHOLD = 6;

export const TrendsLineChart: FC<
  {
    series: Serie[];
    showTotalTime?: boolean;
    isTimeBased?: boolean;
    wholeNumbersOnly?: boolean;
  } & Partial<LineProps>
> = ({ series, showTotalTime, isTimeBased, wholeNumbersOnly, ...props }) => {
  const colorGradients = series.map((_, i) => ({
    colors: [
      {
        color: 'inherit',
        offset: 0
      },
      {
        color: 'inherit',
        offset: 100,
        opacity: 0
      }
    ],
    id: `gradient-${i}`,
    type: 'linearGradient'
  }));

  const colorFillArray = series.map((_, i) => ({
    id: `gradient-${i}`,
    match: '*' as '*' // Nivo needs this for some reason
  }));

  const weeksCount = (series.length && series[0].data.length) || 0;

  const bottomAxisRotationFactor = useMemo(() => {
    return Math.ceil(weeksCount / WEEK_FORMATTING_THRESHOLD);
  }, [weeksCount]);

  if (!series.length)
    return (
      <Line big bold>
        No Trends Data Available
      </Line>
    );

  const array = useMemo(
    () =>
      series
        .map((item) => item.data.map((item) => ({ y: Number(item.y) })))
        .flat(),
    [series]
  );

  const tickValues = useMemo(
    () =>
      createTickArray(array, {
        isTimeBased: isTimeBased,
        wholeNumbers: wholeNumbersOnly
      }),
    [array, isTimeBased, wholeNumbersOnly]
  );

  return (
    <ResponsiveLine
      animate
      curve="monotoneX"
      data={series}
      colors={props.colors ? props.colors : (d) => d.color}
      defs={colorGradients}
      fill={colorFillArray}
      areaOpacity={0.15}
      enableCrosshair
      enableArea
      useMesh
      enableSlices="x"
      enableGridX={false}
      axisLeft={{
        format: getDurationString,
        tickSize: 4,
        tickPadding: 15,
        ...props?.axisLeft,
        tickValues: tickValues
      }}
      axisBottom={{
        tickPadding: 15,
        tickSize: 4,
        format: formatAsDate,
        tickRotation:
          bottomAxisRotationFactor > 1 ? bottomAxisRotationFactor * -8 : 0,
        ...props.axisBottom
      }}
      gridYValues={props?.gridYValues ?? tickValues}
      theme={chartTheme}
      margin={{
        bottom: 25 + 10 * bottomAxisRotationFactor,
        left: 75,
        right: 40,
        top: 20
      }}
      yScale={{
        type: 'linear',
        max: last(tickValues)
      }}
      yFormat={
        (props.yFormat ??
          getDurationStringWithPlaceholderTxt) as ValueFormat<DatumValue>
      }
      xFormat={formatAsDate as ValueFormat<DatumValue>}
      sliceTooltip={(x) => {
        return (
          <SliceTooltip points={x.slice.points} showTotalTime={showTotalTime} />
        );
      }}
    />
  );
};
