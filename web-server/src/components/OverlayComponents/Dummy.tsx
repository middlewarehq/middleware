import { useRouter } from 'next/router';

import { FlexBox } from '../FlexBox';
import { Line } from '../Text';

export const Dummy = () => {
  const router = useRouter();
  return (
    <FlexBox col gap1>
      <Line big white bold>
        Hi! This is a dummy component!
      </Line>
      <Line whiteSpace="pre-wrap" mono>
        {JSON.stringify(router.query, null, '  ')}
      </Line>
    </FlexBox>
  );
};
