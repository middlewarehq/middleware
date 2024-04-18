import { CheckCircleOutlined, WarningAmberRounded } from '@mui/icons-material';
import { emphasize, lighten } from '@mui/material';
import { FC, useMemo, useCallback } from 'react';

import { Chart2 } from '@/components/Chart2';
import { FlexBox } from '@/components/FlexBox';
import { PrTableWithPrExclusionMenu } from '@/components/PRTable/PrTableWithPrExclusionMenu';
import { Line } from '@/components/Text';
import { LineProps } from '@/components/Text/index';
import { useModal } from '@/contexts/ModalContext';
import { PR } from '@/types/resources';
import { percent } from '@/utils/datatype';

export const RevertedPrs: FC<{
  id: string;
  prs: PR[];
  revertedPrs: PR[];
  titleProps?: LineProps;
  prUpdateCallback?: () => void;
}> = ({ id, prs, revertedPrs, titleProps, prUpdateCallback }) => {
  const { addModal } = useModal();

  const series = useMemo(
    () =>
      [
        {
          data: revertedPrs.length,
          color: emphasize('#F8BBD0', 0.1),
          label: 'Reverted'
        },
        {
          data: prs.length,
          color: lighten('#80DEEA', 0.2),
          label: 'Merged'
        }
      ].filter((serie) => serie.data),
    [prs.length, revertedPrs.length]
  );
  const [revertedSeries, revertedColors, revertedLabels, revertedPrCount] =
    useMemo(
      () => [
        series.map((s) => s.data),
        series.map((s) => s.color),
        series.map((s) => s.label),
        revertedPrs.length
      ],
      [revertedPrs.length, series]
    );

  const openRevertedPrsModal = useCallback(async () => {
    addModal({
      title: `Reverted PRs`,
      body: (
        <PrTableWithPrExclusionMenu
          propPrs={revertedPrs}
          onUpdateCallback={prUpdateCallback}
        />
      ),
      showCloseIcon: true
    });
  }, [addModal, prUpdateCallback, revertedPrs]);

  if (!prs.length) return null;

  return (
    <FlexBox col gap1>
      <FlexBox col>
        <Line white bold {...titleProps} mb={0}>
          PRs reverted
        </Line>
        <Line mb={titleProps?.mb} small>
          These were merged to mitigate bugs from recent PRs
        </Line>
      </FlexBox>
      <FlexBox gap={2}>
        <FlexBox height="120px" width="120px">
          <Chart2
            id={id}
            type="doughnut"
            series={[
              {
                data: revertedSeries,
                backgroundColor: revertedColors,
                borderColor: revertedColors
              }
            ]}
            labels={revertedLabels}
          />
        </FlexBox>
        {Boolean(revertedPrs.length) ? (
          <FlexBox col>
            <Line big bold color={'#F8BBD0'}>
              <WarningAmberRounded
                sx={{
                  verticalAlign: 'text-bottom',
                  position: 'relative',
                  top: '2px',
                  mr: '2px'
                }}
              />
              {prs.length === revertedPrs.length ? 'All ' : ''}
              {revertedPrCount} {revertedPrCount > 1 ? 'PRs' : 'PR'}
              {percent(revertedPrCount, prs.length)
                ? ` (${percent(revertedPrCount, prs.length)}%)`
                : ''}
            </Line>
            <Line white whiteSpace="nowrap">
              reverted after merge
            </Line>
            <Line
              small
              color="info"
              whiteSpace="nowrap"
              sx={{ cursor: 'pointer' }}
              component={FlexBox}
              fit
              darkTip
              onClick={openRevertedPrsModal}
            >
              see details
            </Line>
          </FlexBox>
        ) : (
          <FlexBox col>
            <Line big bold color={lighten('#80DEEA', 0.2)}>
              <CheckCircleOutlined
                sx={{
                  verticalAlign: 'text-bottom',
                  position: 'relative',
                  top: '2px',
                  mr: '2px'
                }}
              />
              No {prs.length > 1 ? ' PRs' : ' PR'}
            </Line>
            <Line white whiteSpace="nowrap">
              reverted after merge
            </Line>
          </FlexBox>
        )}
      </FlexBox>
    </FlexBox>
  );
};
