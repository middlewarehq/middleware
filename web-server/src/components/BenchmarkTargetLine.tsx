import { Box } from '@mui/material';
import { FC } from 'react';

type BenchmarkTargetLineProps = {
  /** The resolved benchmark target, in the same unit as `values`. */
  target: number;
  // CLUSTOX: the same array the card's own trend chart plots. Chart2's grid
  // charts always `beginAtZero` and add `grace: '10%'` headroom on top of
  // the max value (see InternalChart2.tsx) -- mirroring that here is what
  // makes the dashed line land at the same height on the card as it would
  // inside the chart's own y-scale, instead of floating at an arbitrary
  // fixed position that doesn't track the data.
  values?: number[];
};

// CLUSTOX: dashed horizontal rule marking the benchmark target on a card's
// trend chart. Deliberately just a positioned line, not a chart.js
// annotation -- the four cards already hide their y-axis (`display: false`),
// so there's no on-chart scale for a plugin-drawn line to key off either;
// the exact number lives in the caption text next to it.
export const BenchmarkTargetLine: FC<BenchmarkTargetLineProps> = ({
  target,
  values = []
}) => {
  // CLUSTOX: filter to finite numbers first. The Change Failure Rate series
  // is built from an optional-chained `head(...)?.data.map(...)`, so a
  // `undefined`/`NaN` entry is reachable -- and one of those makes `max`
  // `NaN`, which `NaN || 1` quietly turns into `1`, clamping any target to 1
  // and pinning the line at 100% of the card. A wrong line is worse than no
  // line, so the bad values are dropped rather than propagated.
  const finiteValues = values.filter((value) => Number.isFinite(value));
  const max = Math.max(target, 0, ...finiteValues) * 1.1 || 1;
  const clampedTarget = Math.min(Math.max(target, 0), max);
  const fromBottomPct = (clampedTarget / max) * 100;

  return (
    <Box
      position="absolute"
      left={0}
      right={0}
      bottom={`${fromBottomPct}%`}
      sx={{
        borderTop: '1px dashed',
        borderColor: 'rgba(255, 255, 255, 0.4)',
        pointerEvents: 'none'
      }}
    />
  );
};
