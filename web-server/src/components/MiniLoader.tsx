import { Box, BoxProps, CircularProgress, LinearProgress } from '@mui/material';
import { FC, ReactNode } from 'react';

import { FlexBox, FlexBoxProps } from './FlexBox';

export const MiniLoader: FC<{ label: ReactNode } & BoxProps> = ({
  label,
  ...props
}) => (
  <Box width="fit-content" {...props}>
    {label}
    <LinearProgress sx={{ mt: 1 }} />
  </Box>
);

export const MiniCircularLoader: FC<
  {
    label: ReactNode;
    position?: 'start' | 'end';
  } & FlexBoxProps
> = ({ label, position = 'start', ...props }) => (
  <FlexBox fit alignCenter gap1 {...props}>
    {position === 'end' && label}
    <CircularProgress size="1em" />
    {position === 'start' && label}
  </FlexBox>
);
