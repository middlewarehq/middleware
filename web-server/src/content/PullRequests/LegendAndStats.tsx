import {
  alpha,
  Box,
  Button,
  darken,
  Divider,
  Typography,
  useTheme
} from '@mui/material';
import React from 'react';
import { FC, Fragment, ReactNode } from 'react';

import { LegendItem } from '@/components/LegendItem';

export const LegendAndStats: FC<{
  legendOutside?: boolean;
  onChartReset: () => any;
  legends: {
    color: string;
    title: ReactNode;
  }[];
  sections: {
    title: ReactNode;
    stats: {
      label: ReactNode;
      value: ReactNode;
    }[];
    toggle: (sectionIndex: number) => any;
    collapse: boolean;
  }[];
}> = ({ onChartReset, legends, sections, children, legendOutside }) => {
  const theme = useTheme();
  const hasChildren = Boolean(React.Children.count(children));

  return (
    <Box
      position={legendOutside ? 'initial' : 'absolute'}
      top={legendOutside ? undefined : theme.spacing(2)}
      right={legendOutside ? undefined : theme.spacing(2)}
      display="flex"
      height="fit-content"
      flexShrink={0}
      gap={1}
      flexDirection="column"
      p={2}
      borderRadius={1}
      bgcolor={alpha(darken(theme.colors.secondary.main, 0.8), 0.7)}
      zIndex={1}
      sx={
        legendOutside
          ? undefined
          : {
              transition: `all 0.5s`,
              opacity: 0.5,
              userSelect: 'none',
              ':hover': {
                opacity: 1
              }
            }
      }
    >
      <Button
        color="primary"
        variant="contained"
        size="small"
        sx={{
          px: 1 / 2,
          py: 0,
          fontSize: '0.8em',
          minWidth: 'unset',
          mb: 1
        }}
        onClick={onChartReset}
      >
        reset chart
      </Button>
      <Typography variant="h5">Legend</Typography>
      {legends.map((legend, i) => (
        <LegendItem key={i} color={legend.color} label={legend.title} />
      ))}
      {sections.map((section, i) => (
        <Fragment key={i}>
          <Divider light={false} sx={{ mt: 0.5 }} />
          <Box
            display="flex"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h5">{section.title}</Typography>
            <Button
              color="primary"
              variant="contained"
              size="small"
              sx={{
                px: 1 / 2,
                py: 0,
                fontSize: '0.8em',
                minWidth: 'unset'
              }}
              onClick={() => section.toggle(i)}
            >
              {section.collapse ? 'show' : 'hide'}
            </Button>
          </Box>
          {!section.collapse &&
            section.stats.map((stat, i) => (
              <LegendItem
                key={i}
                color={legends[i].color}
                label={
                  <Box
                    display="flex"
                    gap={1 / 2}
                    justifyContent="space-between"
                  >
                    <Box fontWeight="bold">{stat.value}</Box>
                    {stat.label}
                  </Box>
                }
                size="small"
              />
            ))}
        </Fragment>
      ))}
      {hasChildren && <Divider light={false} sx={{ mt: 1 }} />}
      {children}
    </Box>
  );
};
