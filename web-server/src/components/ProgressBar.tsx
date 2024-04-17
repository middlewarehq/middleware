import { FC, useEffect } from 'react';

import { FlexBox, FlexBoxProps } from '@/components/FlexBox';
import { useEasyState } from '@/hooks/useEasyState';
import { depFn } from '@/utils/fn';

export const ProgressBar: FC<
  {
    perc: number;
    color?: 'primary' | 'warning';
    flip?: boolean;
    remainingTitle?: string;
    progressTitle?: string;
    progressOnClick?: () => void;
    remainingOnClick?: () => void;
  } & FlexBoxProps
> = ({
  progressTitle,
  remainingTitle,
  progressOnClick,
  remainingOnClick,
  perc,
  color = 'primary',
  flip,
  ...props
}) => {
  const widthState = useEasyState(0);
  useEffect(() => {
    depFn(widthState.set, perc);
  }, [perc, widthState.set]);

  return (
    <FlexBox
      fullWidth
      relative
      round
      overflow="hidden"
      bgcolor={`${color}.light`}
      justifyEnd={flip}
      {...props}
    >
      <FlexBox
        width={`calc(${100 - widthState.value}% + 4px)`}
        height={'100%'}
        position="absolute"
        right={0}
        top={0}
        zIndex={1}
        title={remainingTitle}
        darkTip
        onClick={remainingOnClick ? remainingOnClick : undefined}
        pointer
        sx={{
          transition: 'all 0.3s ease-out',
          ':hover': {
            backgroundColor: `${color}.light`,
            filter: 'brightness(1.2)'
          }
        }}
      />
      <FlexBox
        width={`${widthState.value}%`}
        bgcolor={`${color}.main`}
        height="100%"
        minHeight="0.5em"
        round
        zIndex={2}
        title={progressTitle}
        darkTip
        onClick={progressOnClick ? progressOnClick : undefined}
        pointer
        sx={{
          transition: 'all 0.3s ease-out',
          ':hover': {
            filter: 'brightness(1.2)'
          }
        }}
      />
    </FlexBox>
  );
};
