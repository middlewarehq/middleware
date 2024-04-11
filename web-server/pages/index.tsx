import { Box, LinearProgress, styled } from '@mui/material';
import Head from 'next/head';
import { ReactElement } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { useRedirectWithSession } from '@/constants/useRoute';
import { Authenticated } from 'src/components/Authenticated';
import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

const OverviewWrapper = styled(Box)(
  ({ theme }) => `
    overflow: auto;
    background: ${theme.palette.common.white};
    flex: 1;
    overflow-x: hidden;
`
);

function Overview() {
  useRedirectWithSession();

  return (
    <OverviewWrapper>
      <Head>
        <title>MiddlewareHQ</title>
      </Head>
      <FlexBox p={4} col fit gap1>
        <Line white big>
          Please wait while we load the session for you...
        </Line>
        <LinearProgress />
      </FlexBox>
    </OverviewWrapper>
  );
}

export default Overview;

Overview.getLayout = function getLayout(page: ReactElement) {
  return (
    <Authenticated>
      <ExtendedSidebarLayout>{page}</ExtendedSidebarLayout>
    </Authenticated>
  );
};

// Overview.getInitialProps = redirectPage(DEFAULT_HOME_ROUTE.PATH);
