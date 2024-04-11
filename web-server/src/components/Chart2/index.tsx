import dynamic from 'next/dynamic';

export const Chart2 = dynamic(() => import('./InternalChart2'), {
  ssr: false
});

export type {
  ChartLabels,
  ChartOnClick,
  ChartOnZoom,
  ChartOptions,
  ChartProps,
  ChartSeries,
  ChartType
} from './InternalChart2';

export { getChartZoomResetBtn, resetChartById } from './InternalChart2';
