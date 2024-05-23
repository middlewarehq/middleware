import { Paper } from '@mui/material';
import { FC, useEffect } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { useBoolState } from '@/hooks/useEasyState';

const ANIMATON_DURATION = 1000;

export const SkeletalCard = () => {
  const flickerAnimation = useBoolState();

  useEffect(() => {
    const flickerInterval = setInterval(
      flickerAnimation.toggle,
      ANIMATON_DURATION
    );

    return () => {
      clearInterval(flickerInterval);
    };
  }, [flickerAnimation.toggle]);
  return (
    <FlexBox
      minHeight={'15em'}
      component={Paper}
      col
      relative
      width={'100%'}
      flexGrow={1}
      overflow={'hidden'}
      height={'100%'}
      p={2}
    >
      <FlexBox
        col
        justifyBetween
        height={'100%'}
        sx={{
          filter: `brightness(${flickerAnimation.value ? 0.7 : 1})`,
          transition: `all ${ANIMATON_DURATION}ms linear`
        }}
      >
        <FlexBox fullWidth justifyBetween>
          <FlexBox gap1>
            <Skeleton width="200px" />
            <Skeleton width="30px" />
          </FlexBox>
          <Skeleton width="75px" />
        </FlexBox>
        <FlexBox col gap2>
          <Skeleton width="100px" height="20px" />
          <Skeleton width="200px" />
          <Skeleton width="100px" height="20px" />
        </FlexBox>
      </FlexBox>
    </FlexBox>
  );
};

const Skeleton: FC<{ width?: string; height?: string }> = ({
  width = '150px',
  height = '30px'
}) => (
  <FlexBox
    height={height}
    bgcolor={'#262E5E'}
    width={width}
    borderRadius={'20px'}
  />
);
