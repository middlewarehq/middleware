import { useTheme } from '@mui/material';
import Link from 'next/link';
import { FC } from 'react';

import { commonProps } from '@/content/DoraMetrics/MetricsCommonProps';
import { OPEN_IN_NEW_TAB_PROPS } from '@/utils/url';

import { DoraScoreProps } from './DoraScore';
import { FlexBox } from './FlexBox';
import { Line } from './Text';

export const DoraScoreV2: FC<DoraScoreProps> = ({ ...stats }) => {
  return (
    <FlexBox>
      <FlexBox centered gap={1.5}>
        <FlexBox col>
          <Line bigish bold white>
            Your DORA
          </Line>
          <Line bigish bold white>
            Performance
          </Line>
        </FlexBox>

        <FlexBox col height={'50px'} centered gap={'14px'} ml={1}>
          <DoraScore stat={stats.avg} />
        </FlexBox>

        <FlexBox col ml={4}>
          <Line bigish bold white>
            Industry
          </Line>
          <Line bigish bold white>
            Standard
          </Line>
        </FlexBox>

        <DoraScore stat={stats.standard} isIndustry />

        <FlexBox col>
          <Line bigish medium>
            Based on data available
          </Line>
          <Line bigish>
            at{' '}
            <Line info semibold>
              <Link
                href="https://dora.dev/quickcheck"
                {...OPEN_IN_NEW_TAB_PROPS}
              >
                dora.dev
              </Link>
            </Line>
          </Line>
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
};

export const DoraScore: FC<{ stat: number; isIndustry?: boolean }> = ({
  stat,
  isIndustry
}) => {
  const theme = useTheme();
  return (
    <FlexBox
      corner={theme.spacing(1)}
      px={1.5}
      sx={{
        background: isIndustry ? purpleBg : null,
        backgroundColor: !isIndustry && getBg(stat)
      }}
    >
      <Line fontSize={'2.4em'} bold white>
        {stat}{' '}
        <Line fontSize="0.8rem" ml="-4px">
          / 10
        </Line>
      </Line>
    </FlexBox>
  );
};

const purpleBg = `linear-gradient(30deg,#8C7CF0, #3E2EA4)`;

const getBg = (stat: number) => ({
  background:
    stat >= 8
      ? commonProps.elite.bg
      : stat >= 6
      ? commonProps.high.bg
      : stat >= 4
      ? commonProps.medium.bg
      : commonProps.low.bg
});
