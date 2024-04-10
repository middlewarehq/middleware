import { ArrowForwardRounded, InfoOutlined } from '@mui/icons-material';
import { useTheme } from '@mui/material';
import { FC } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';

export const CorelationInsightCardFooter = () => {
  const theme = useTheme();
  return (
    <FlexBox
      p={1}
      gap={1 / 2}
      alignCenter
      pointer
      sx={{
        transition: 'all 0.2s',
        ':hover': {
          bgcolor: theme.colors.secondary.lighter
        }
      }}
    >
      <InfoOutlined fontSize="small" color="info" />
      <Line white>Some correlation Insights</Line>
      <FlexBox round ml="auto">
        <ArrowForwardRounded color="info" fontSize="small" />
      </FlexBox>
    </FlexBox>
  );
};

export const UnavailableCorrelation: FC<{
  type: 'INTEGRATION' | 'INSUFFICIENT_DATA';
}> = ({ type }) => {
  const theme = useTheme();
  const label =
    type === 'INTEGRATION'
      ? 'Correlated insights require integration to be linked'
      : 'Not enough data to present correlated insights';
  return (
    <FlexBox
      p={1}
      gap={1 / 2}
      alignCenter
      pointer
      sx={{
        transition: 'all 0.2s',
        ':hover': {
          bgcolor: theme.colors.secondary.lighter
        }
      }}
    >
      <InfoOutlined fontSize="small" color="info" />
      <Line white>{label}</Line>
    </FlexBox>
  );
};
