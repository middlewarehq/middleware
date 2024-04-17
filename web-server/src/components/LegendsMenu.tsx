import { Box, useTheme } from '@mui/material';
import { Serie } from '@nivo/line';
import { FC } from 'react';

import { FlexBox } from './FlexBox';

export const LegendsMenu: FC<{
  series: Serie[];
}> = ({ series }) => {
  const theme = useTheme();

  return (
    <FlexBox
      gap={2}
      alignCenter
      fullWidth
      wrap
      sx={{ rowGap: theme.spacing(1 / 4) }}
      justifyCenter
    >
      {series?.map((dataset, index) => {
        return (
          <FlexBox alignCenter key={index}>
            <FlexBox col>
              <FlexBox gap1 alignCenter>
                {dataset.id}
                <Box
                  sx={{
                    width: theme.spacing(2),
                    height: theme.spacing(3 / 4),
                    backgroundColor: dataset.color,
                    borderRadius: theme.spacing(1 / 2)
                  }}
                />
              </FlexBox>
            </FlexBox>
          </FlexBox>
        );
      })}
    </FlexBox>
  );
};
