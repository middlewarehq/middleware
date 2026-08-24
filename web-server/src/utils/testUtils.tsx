import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';

import ThemeProviderWrapper from '@/theme/ThemeProvider';

// CLUSTOX: the app always renders inside this ThemeProvider (see
// pages/_app.tsx) -- it's what supplies theme.colors, theme.header, etc. on
// top of bare MUI, which several components reach for even indirectly (a
// FlexBox's `title` prop renders a MUI Tooltip via Shared.tsx's
// TooltipWrapper, which reads theme.colors.alpha). Without this wrapper,
// useTheme() falls back to MUI's bare default theme and anything touching
// those custom fields throws. First hit by JiraIntegrationCard's Linked
// badge.
export const renderWithTheme = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: ThemeProviderWrapper, ...options });
