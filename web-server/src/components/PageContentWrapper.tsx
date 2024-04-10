import { FC } from 'react';
import { ErrorBoundary } from 'react-error-boundary';

import { ErrorBoundaryFallback } from '@/components/ErrorBoundaryFallback/index';

import { FlexBox, FlexBoxProps } from './FlexBox';
import Scrollbar from './Scrollbar';

export const PageContentWrapper: FC<
  FlexBoxProps & { noScrollbars?: boolean }
> = ({ children, noScrollbars, ...props }) => {
  const content = (
    <FlexBox
      id="page-content-wrapper"
      p={4}
      pb={10}
      display="flex"
      flexDirection="column"
      gap={2}
      minHeight="100%"
      minWidth="100%"
      {...props}
    >
      <ErrorBoundary FallbackComponent={ErrorBoundaryFallback}>
        {children}
      </ErrorBoundary>
    </FlexBox>
  );

  if (noScrollbars) return content;

  return <Scrollbar>{content}</Scrollbar>;
};
