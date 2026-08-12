import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import HelpOutlineRounded from '@mui/icons-material/HelpOutlineRounded';
import { alpha } from '@mui/material';
import { useMemo } from 'react';

import { Chart2 } from '@/components/Chart2';
import { useSelectedContributors } from '@/components/ContributorFilter';
import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import {
  CardRoot,
  NoDataImg
} from '@/content/DoraMetrics/DoraCards/sharedComponents';
import { useDoraCardChartOptions } from '@/content/DoraMetrics/DoraCards/sharedHooks';
import { useCountUp } from '@/hooks/useCountUp';
import { useSelector } from '@/store';
import { benchmarkCaption } from '@/utils/benchmarks';
import { buildLocCardModel } from '@/utils/locCard';

import { DoraMetricsComparisonPill } from '../DoraMetricsComparisonPill';

// CLUSTOX: lines of code has no DORA classification -- there is no
// elite/high/medium/low threshold table for it, and there should not be one.
// So the card borrows no `commonProps` entry and shows no classification chip;
// a "Medium" badge here would be an invented judgement. The accent is a fixed
// neutral instead, and the only colour that carries meaning on this card is
// the benchmark caption's, exactly as on the other four.
const LOC_ACCENT = '#a4d3d3';

const { format: compact } = Intl.NumberFormat('en', {
  notation: 'compact',
  maximumFractionDigits: 1
});
const { format: exact } = Intl.NumberFormat('en');

export const LinesOfCodeCard = () => {
  const selectedContributors = useSelectedContributors();

  // CLUSTOX: both keys are optional on the response -- an older backend, or a
  // LOC route that failed inside the BFF's Promise.all, leaves them
  // `undefined`. Read them raw and let `buildLocCardModel` do every access, so
  // there is exactly one place that has to tolerate absence.
  const locStats = useSelector((s) => s.doraMetrics.metrics_summary?.loc_stats);
  const locTrends = useSelector(
    (s) => s.doraMetrics.metrics_summary?.loc_trends
  );
  const locBenchmark = useSelector(
    (s) => s.doraMetrics.metrics_summary?.benchmarks?.lines_of_code
  );

  const model = useMemo(
    () => buildLocCardModel(locStats, locTrends),
    [locStats, locTrends]
  );

  // CLUSTOX: the plotted series is average PR size, NOT the weekly totals the
  // headline shows. The band is drawn in this chart's own data space, so the
  // series behind the number has to be in the same unit as the target -- lines
  // per PR. Plotting totals here and drawing a 200-line target over them would
  // put the band on the axis floor of a ~70,000-tall scale: correct
  // arithmetic, and a wrong answer that looks entirely plausible.
  const series = useMemo(
    () => [
      {
        label: 'Avg. PR size',
        fill: 'start',
        data: model.avgPrSizeValues,
        backgroundColor: alpha(LOC_ACCENT, 0.2),
        borderColor: alpha(LOC_ACCENT, 0.5),
        lineTension: 0.2
      }
    ],
    [model.avgPrSizeValues]
  );

  // CLUSTOX: gated on `canComparePrSize`, which is false both when LOC was
  // never measured and when nothing was merged. Passing `actual: 0` in the
  // latter case would paint a success band for a team that shipped nothing --
  // the same trap the Change Failure Rate card has with no deployments.
  const chartOptions = useDoraCardChartOptions(
    model.canComparePrSize
      ? {
          metric: 'lines_of_code',
          target: locBenchmark?.target,
          // CLUSTOX: lines per PR on both sides. `avg_pr_size` is what the
          // benchmark form stores in lines, what `values` plots, and what this
          // compares -- no conversion anywhere, unlike Deployment Frequency.
          actual: model.avgPrSize,
          values: model.avgPrSizeValues
        }
      : null
  );

  const benchmarkLine = useMemo(
    () =>
      model.canComparePrSize && locBenchmark
        ? benchmarkCaption(
            'lines_of_code',
            model.avgPrSize,
            locBenchmark.target,
            locBenchmark.source
          )
        : null,
    [model.canComparePrSize, model.avgPrSize, locBenchmark]
  );

  const linesChanged = useCountUp(model.total);

  return (
    // CLUSTOX: no `onClick` and no pointer cursor. There is no LOC drill-down
    // overlay, and CardRoot's default hover-brighten plus pointer cursor would
    // promise one -- the four other cards each open a real page.
    <CardRoot sx={{ cursor: 'default' }}>
      <FlexBox col gap1 flexGrow={1} minHeight={'15em'}>
        <FlexBox justifyBetween paddingX={2} alignCenter>
          <FlexBox gap1 alignCenter>
            <Line white huge bold py={1}>
              Lines of Code
            </Line>
            <FlexBox
              color="white"
              darkTip
              title={
                <FlexBox col gap={1 / 2}>
                  <Line medium white>
                    Lines added and deleted across pull requests merged in this
                    period. Unmerged work is not counted.
                  </Line>
                  <Line medium>
                    The benchmark tracks average PR size, not weekly volume:
                    volume has no good direction, while smaller PRs review
                    faster and merge sooner. The trend behind the number is
                    average PR size.
                  </Line>
                </FlexBox>
              }
            >
              <HelpOutlineRounded sx={{ fontSize: '1.4em' }} />
            </FlexBox>
          </FlexBox>
        </FlexBox>
        {Boolean(selectedContributors.length) && (
          // CLUSTOX: LOC goes through the same `pr_filter` the Lead Time metric
          // gets, so it is filtered by PR author -- the same wording, because
          // it is genuinely the same filter and not the deploy actor.
          <Line small secondary paddingX={2} mt={-1}>
            authored by {selectedContributors.join(', ')}
          </Line>
        )}
        {benchmarkLine && (
          <Line
            small
            paddingX={2}
            mt={-1}
            color={benchmarkLine.tone === 'good' ? 'success' : 'warning'}
          >
            {benchmarkLine.text}
          </Line>
        )}
        <FlexBox col justifyBetween relative fullWidth flexGrow={1}>
          <FlexBox height={'100%'} sx={{ justifyContent: 'flex-end' }}>
            {model.isMeasured ? (
              <Chart2
                id="lines-of-code"
                type="line"
                series={series}
                options={chartOptions}
              />
            ) : (
              <NoDataImg />
            )}
          </FlexBox>

          <FlexBox position="absolute" fill col paddingX={2} gap1 justifyCenter>
            {model.isMeasured ? (
              <FlexBox justifyCenter sx={{ width: '100%' }} col>
                <Line bigish medium color={LOC_ACCENT}>
                  Lines changed
                </Line>
                <FlexBox
                  alignCenter
                  fit
                  title={`${exact(model.total)} lines changed — ${exact(
                    model.prevTotal
                  )} in the previous period`}
                >
                  <Line bold color={LOC_ACCENT} sx={{ fontSize: '3em' }}>
                    {compact(linesChanged)}
                  </Line>
                </FlexBox>
                <FlexBox
                  gap={1}
                  alignCenter
                  fit
                  title={`${exact(model.additions)} added, ${exact(
                    model.deletions
                  )} deleted`}
                >
                  <Line small bold color="success">
                    +{compact(model.additions)}
                  </Line>
                  <Line small secondary>
                    /
                  </Line>
                  {/* CLUSTOX: deletions are `warning`, never `error`. Deleted
                      code is not a failure -- often the opposite -- and red
                      here would read as one. */}
                  <Line small bold color="warning">
                    −{compact(model.deletions)}
                  </Line>
                </FlexBox>
                <FlexBox gap={2} alignCenter mt={1 / 2}>
                  <Line small medium color={LOC_ACCENT}>
                    Avg. PR size {exact(model.avgPrSize)}{' '}
                    {model.avgPrSize === 1 ? 'line' : 'lines'}
                  </Line>
                  {/* CLUSTOX: the delta rides on average PR size, not on the
                      headline. Weekly volume has no good direction -- higher
                      could be productive or bloated -- so a green up-arrow on
                      it would be a judgement the metric cannot support. PR size
                      is unambiguously lower-is-better, hence `positive={false}`.
                      The headline's previous-period figure is in its tooltip,
                      uncoloured. */}
                  {Boolean(model.avgPrSize || model.prevAvgPrSize) && (
                    <DoraMetricsComparisonPill
                      val={model.avgPrSize}
                      against={model.prevAvgPrSize}
                      prevFormat={(val) => `${exact(Math.round(val))} lines/PR`}
                      positive={false}
                      boxed
                      light
                      size="1.2em"
                      lineProps={{ bold: false, fontWeight: 600 }}
                    />
                  )}
                </FlexBox>
              </FlexBox>
            ) : (
              // CLUSTOX: "not measured", deliberately not "no lines changed".
              // A team that changed nothing gets a real zero from the backend
              // and lands in the branch above; this branch only happens when
              // the response carried no `loc_stats` at all.
              <Line huge display="flex" whiteSpace="pre" alignItems="center">
                <ErrorOutlineRoundedIcon /> Lines of code unavailable
              </Line>
            )}
          </FlexBox>
        </FlexBox>
      </FlexBox>
    </CardRoot>
  );
};
