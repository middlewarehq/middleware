import { Paper, useTheme } from '@mui/material';
import Img from 'next/image';

import { FlexBox, FlexBoxProps } from '@/components/FlexBox';

export const CardRoot = (props: FlexBoxProps) => (
  <FlexBox
    component={Paper}
    col
    relative
    width={'100%'}
    flexGrow={1}
    overflow={'hidden'}
    height={'100%'}
    {...props}
  />
);

export const NoDataImg = () => {
  const theme = useTheme();
  return (
    <Img
      src="/static/images/placeholders/illustrations/no-data.svg"
      alt="no-data"
      height="200"
      width="200"
      style={{
        position: 'absolute',
        top: theme.spacing(-5),
        right: theme.spacing(2),
        opacity: 0.75
      }}
    />
  );
};

export const FeatureComingSoonImg = () => {
  const theme = useTheme();
  return (
    <Img
      src="/static/images/placeholders/illustrations/coming-soon.svg"
      alt="no-data"
      height="200"
      width="200"
      style={{
        position: 'absolute',
        top: theme.spacing(-5),
        right: theme.spacing(2),
        opacity: 0.75
      }}
    />
  );
};
