import { useTheme, alpha } from '@mui/material';
import {
  ChartConfiguration,
  ChartType as LibChartType,
  CoreChartOptions,
  Interaction
} from 'chart.js';
import Chart from 'chart.js/auto';
import AnnotationPlugin from 'chartjs-plugin-annotation';
import ChartTrendline from 'chartjs-plugin-trendline';
import { equals, mergeDeepRight } from 'ramda';
import { FC, memo, useEffect, useMemo, useRef } from 'react';

import { brandColors } from '@/theme/schemes/theme';
import { staticArray } from '@/utils/mock';

if (typeof window !== 'undefined') {
  (async () => {
    const [
      { default: zoomPlugin },
      { CrosshairPlugin, Interpolate },
      { default: GradientPlugin }
    ] = await Promise.all([
      import('chartjs-plugin-zoom'),
      import('chartjs-plugin-crosshair'),
      import('chartjs-plugin-gradient')
    ]);
    Chart.register(zoomPlugin);
    Chart.register(CrosshairPlugin);
    Chart.register(GradientPlugin);
    // @ts-ignore
    Interaction.modes.interpolate = Interpolate;
    Chart.register(AnnotationPlugin);
    Chart.register(ChartTrendline);
  })();
}

export type ChartConfig = ChartConfiguration<LibChartType, number[]>;
export type ChartType = ChartConfig['type'];
export type ChartSeries = ChartConfig['data']['datasets'];
export type ChartLabels = string[];
export type ChartOnClick = CoreChartOptions<LibChartType>['onClick'];
export type ChartOnZoom = (start: number, end: number) => any;
export type ChartOptions = Partial<ChartConfig>;
export type ChartProps = {
  id: ID;
  series: ChartSeries;
  type?: ChartType;
  labels?: ChartLabels;
  options?: ChartOptions;
  onClick?: ChartOnClick;
  onZoom?: ChartOnZoom;
};

const ChartInternal: FC<ChartProps> = memo(
  ({ id, type = 'bar', series, labels, options, onClick, onZoom }) => {
    const elRef = useRef<HTMLCanvasElement>();
    const theme = useTheme();

    const isGridChart = (
      ['bar', 'bubble', 'line', 'scatter'] as ChartType[]
    ).includes(type);

    const chartLabels = useMemo(() => {
      if (!labels) return staticArray(series[0].data.length, (i) => i + 1);
      return labels;
    }, [labels, series]);

    const chartOptions = useMemo(
      () =>
        mergeDeepRight(
          {
            type,
            data: {
              labels: chartLabels,
              datasets: series?.map((serie, i) => ({
                ...serie,
                backgroundColor:
                  serie.backgroundColor ||
                  // @ts-ignore
                  chartElement[type as ElementConfig]?.backgroundColor?.[i],
                borderColor:
                  serie.borderColor ||
                  // @ts-ignore
                  chartElement[type as ElementConfig]?.borderColor?.[i],
                borderWidth:
                  serie.borderWidth ||
                  // @ts-ignore
                  chartElement[type as ElementConfig]?.borderWidth?.[i]
              }))
            } as any,
            options: {
              animation: false,
              maintainAspectRatio: false,
              responsive: true,
              scales: isGridChart
                ? {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        color: brandColors.pr.firstResponseTime,
                        crossAlign: 'near'
                      },
                      grace: '10%',
                      grid: {
                        color: alpha(brandColors.pr.firstResponseTime, 0.2),
                        borderColor: brandColors.pr.firstResponseTime,
                        tickColor: brandColors.pr.firstResponseTime,
                        borderDash: [5, 2]
                      }
                    },
                    x: {
                      grid: {
                        borderColor: brandColors.pr.firstResponseTime,
                        drawOnChartArea: true,
                        tickColor: brandColors.pr.firstResponseTime
                      },
                      ticks: {
                        color: brandColors.pr.firstResponseTime,
                        crossAlign: 'near'
                      }
                    }
                  }
                : undefined,
              onClick,
              elements: chartElement,
              interaction: isGridChart
                ? { mode: 'nearest', axis: 'x', intersect: false }
                : undefined,
              plugins: {
                crosshair: isGridChart
                  ? {
                      line: { color: '#FFF4', dashPattern: [2, 3] },
                      zoom: { enabled: false }
                    }
                  : false,
                legend: { display: false },
                tooltip: {
                  intersect: false,
                  boxPadding: 5,
                  bodyFont: { family: 'Inter' },
                  mode: isGridChart ? 'index' : 'point',
                  position: 'nearest'
                },
                zoom: isGridChart
                  ? {
                      limits: { x: { minRange: 2 } },
                      zoom: {
                        mode: 'x',
                        drag: {
                          enabled: true,
                          backgroundColor: theme.colors.info.lighter,
                          borderColor: theme.colors.info.light,
                          borderWidth: 1
                        },
                        onZoomComplete: ({ chart }) =>
                          onZoom?.(chart.scales.x.min, chart.scales.x.max)
                      }
                    }
                  : undefined
              }
            }
          },
          options || {}
        ) as ChartConfiguration,
      [
        type,
        chartLabels,
        series,
        isGridChart,
        onClick,
        theme.colors.info.lighter,
        theme.colors.info.light,
        options,
        onZoom
      ]
    );

    useEffect(() => {
      if (!elRef.current || typeof window === 'undefined') return;
      const existingChart = Chart.getChart(id);
      if (existingChart) existingChart?.destroy?.();
      if (document.querySelectorAll(`#${id}`).length > 1) {
        console.error(
          `Duplicate chart usage. Charts will most likely appear bugged`,
          `Multiple charts used with the same ID: ${id}`
        );
        console.error(`Multiple charts used with the same ID: ${id}`);
      }

      try {
        const chart = new Chart(elRef.current.getContext('2d'), chartOptions);
        return () => {
          chart.destroy();
        };
      } catch (e) {
        console.error(e);
      }
    }, [chartOptions, id]);

    return <canvas ref={elRef} id={id} />;
  },
  (p1, p2) => equals(p1, p2)
);

export default ChartInternal;

const chartColors = [
  brandColors.pr.mergeTime,
  brandColors.pr.firstResponseTime,
  brandColors.pr.reworkTime
];

const chartElement: ChartConfiguration['options']['elements'] = {
  bar: {
    backgroundColor: chartColors,
    borderColor: chartColors
  },
  line: {
    backgroundColor: chartColors.map((col) => alpha(col, 0.5)),
    borderColor: chartColors.map((col) => alpha(col, 0.5)),
    borderWidth: 0,
    tension: 0.4
  },
  point: {
    radius: 0
  }
};

type ElementConfig = keyof typeof chartElement;

export const getChartZoomResetBtn = (id: ID): HTMLButtonElement =>
  document.querySelector(`button.chartsjs-reset-zoom-btn-${id}`);

export const resetChartById = (id: ID) => {
  try {
    Chart.getChart(id)?.resetZoom?.();
  } catch {}
};
