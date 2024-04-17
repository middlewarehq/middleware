import { Box, useTheme } from '@mui/material';
import { FC, ReactNode } from 'react';

export const LegendItem: FC<{
  size?: 'default' | 'small';
  color: string;
  label: ReactNode;
}> = ({ size: _size = 'default', color, label }) => {
  const theme = useTheme();
  const size = _size === 'default' ? 1.5 : 1;
  const fontSize = _size === 'default' ? '1em' : '0.8em';
  const gap = _size === 'default' ? 1 : 0.5;
  return (
    <Box display="flex" alignItems="center" gap={gap}>
      <Box
        height={theme.spacing(size)}
        width={theme.spacing(size)}
        borderRadius="100vw"
        bgcolor={color}
      />
      <Box flex={1} fontSize={fontSize}>
        {label}
      </Box>
    </Box>
  );
};
