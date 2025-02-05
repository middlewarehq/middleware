import { useTheme } from '@mui/material';
import Link from 'next/link';
import { FC } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { getDoraScore } from '@/utils/dora';
import { OPEN_IN_NEW_TAB_PROPS } from '@/utils/url';

import { commonProps } from '../content/DoraMetrics/MetricsCommonProps';

export type DoraScoreProps = ReturnType<typeof getDoraScore> & {
  mode?: 'regular' | 'small';
};

export const DoraScore: FC<DoraScoreProps> = ({
  mode = 'regular',
  ...stats
}) => {
  const theme = useTheme();

  const small = mode === 'small';

  return (
    <FlexBox centered gap={1.5}>
      <FlexBox col>
        <Line bigish={!small} bold white={!small}>
          Your DORA
        </Line>
        <Line bigish={!small} bold white={!small}>
          Performance
        </Line>
      </FlexBox>
      <FlexBox
        corner={theme.spacing(1)}
        px={1.5}
        sx={{
          background:
            stats.avg >= 8
              ? commonProps.elite.bg
              : stats.avg >= 6
                ? commonProps.high.bg
                : stats.avg >= 4
                  ? commonProps.medium.bg
                  : commonProps.low.bg
        }}
      >
        <Line fontSize={small ? '2em' : '2.4em'} bold white>
          {stats.avg}{' '}
          <Line fontSize="0.8rem" ml="-4px">
            / 10
          </Line>
        </Line>
      </FlexBox>
      <FlexBox col>
        <Line bigish={!small} medium>
          Industry standard:{' '}
          <Line white semibold>
            {stats.standard}
          </Line>{' '}
          <Line fontSize="0.7rem" secondary>
            / Powered by{' '}
            <Line primary>
              <Link
                href="https://dora.dev/quickcheck"
                {...OPEN_IN_NEW_TAB_PROPS}
              >
                dora.dev
              </Link>
            </Line>
          </Line>
        </Line>
        <Line bigish={!small}>Based on data available below</Line>
      </FlexBox>
    </FlexBox>
  );
};
