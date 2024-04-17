import { ArrowForwardRounded, InfoOutlined } from '@mui/icons-material';
import { useTheme } from '@mui/material';
import { FC, ReactNode } from 'react';

import { FlexBox, FlexBoxProps } from '@/components/FlexBox';
import { deepMerge } from '@/utils/datatype';

export const InsightChip: FC<
  { startIcon?: ReactNode; endIcon?: ReactNode; cta?: ReactNode } & FlexBoxProps
> = ({
  startIcon = startIconDefault,
  endIcon = endIconDefault,
  cta,
  children,
  ...props
}) => {
  const theme = useTheme();

  return (
    <FlexBox
      p={1}
      border={`1px solid ${theme.colors.secondary.light}`}
      borderRadius={2}
      gap={1 / 2}
      alignCenter
      pointer
      {...props}
      sx={deepMerge(props.sx, {
        transition: 'all 0.2s',
        ':hover': {
          bgcolor: theme.colors.secondary.lighter
        }
      })}
    >
      {startIcon}
      {children}
      <FlexBox ml="auto">{cta}</FlexBox>
      <FlexBox round>{endIcon}</FlexBox>
    </FlexBox>
  );
};

const startIconDefault = <InfoOutlined fontSize="small" color="info" />;
const endIconDefault = <ArrowForwardRounded color="info" fontSize="small" />;
