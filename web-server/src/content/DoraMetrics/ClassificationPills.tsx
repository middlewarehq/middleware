import { KeyboardArrowRightRounded } from '@mui/icons-material';
import { Chip } from '@mui/material';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { getDoraLink } from '@/content/DoraMetrics/getDoraLink';

import { commonProps } from './MetricsCommonProps';

export const ClassificationPills = () => {
  return (
    <FlexBox col gap1 pt={1 / 2}>
      <FlexBox gap1 alignCenter>
        <FlexBox title={commonProps.elite.tooltip} darkTip arrow>
          <Chip
            sx={{ background: commonProps.elite.bg }}
            icon={
              <FlexBox bgcolor="#0003" round>
                <commonProps.elite.icon sx={{ transform: 'scale(0.8)' }} />
              </FlexBox>
            }
            label={
              <Line bold white>
                {commonProps.elite.classification}
              </Line>
            }
            color="success"
          />
        </FlexBox>
        <KeyboardArrowRightRounded />
        <FlexBox title={commonProps.high.tooltip} darkTip arrow>
          <Chip
            sx={{ background: commonProps.high.bg }}
            icon={
              <FlexBox bgcolor="#0003" round>
                <commonProps.high.icon sx={{ transform: 'scale(0.8)' }} />
              </FlexBox>
            }
            label={
              <Line bold white>
                {commonProps.high.classification}
              </Line>
            }
            color="success"
          />
        </FlexBox>
        <KeyboardArrowRightRounded />
        <FlexBox title={commonProps.medium.tooltip} darkTip arrow>
          <Chip
            sx={{ background: commonProps.medium.bg }}
            icon={
              <FlexBox bgcolor="#0003" round>
                <commonProps.medium.icon sx={{ transform: 'scale(0.8)' }} />
              </FlexBox>
            }
            label={
              <Line bold white>
                {commonProps.medium.classification}
              </Line>
            }
            color="success"
          />
        </FlexBox>
        <KeyboardArrowRightRounded />
        <FlexBox title={commonProps.low.tooltip} darkTip arrow>
          <Chip
            sx={{ background: commonProps.low.bg }}
            icon={
              <FlexBox bgcolor="#0003" round>
                <commonProps.low.icon sx={{ transform: 'scale(0.8)' }} />
              </FlexBox>
            }
            label={
              <Line bold white>
                {commonProps.low.classification}
              </Line>
            }
            color="success"
          />
        </FlexBox>
      </FlexBox>
      <FlexBox col>
        <Line tiny>
          This shows how your team performs compared to industry standards for a
          particular metric
        </Line>
        {getDoraLink('How is this determined?')}
      </FlexBox>
    </FlexBox>
  );
};
