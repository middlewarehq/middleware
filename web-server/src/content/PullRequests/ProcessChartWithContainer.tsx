import { FC } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import {
  ProcessChart,
  ProcessChartProps
} from '@/content/PullRequests/ProcessChart';

export const ProcessChartWithContainer: FC<
  ProcessChartProps & { hideTitle?: boolean }
> = ({ hideTitle, ...props }) => {
  // const hasCycleTimeData = useCycleTimeDataCheck();

  // if (!hasCycleTimeData) return null;

  return (
    <>
      {!hideTitle && <ProcessChartTitle />}
      <ProcessChart {...props} />
    </>
  );
};

export const ProcessChartTitle = ({ title }: { title?: string }) => (
  <FlexBox col>
    <Line big white bold>
      {title || 'Pull Request cycle time distribution'}
    </Line>
    <Line tiny>Click or drag over the chart to see PR details</Line>
  </FlexBox>
);
