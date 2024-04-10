import Head from 'next/head';
import { Authenticated } from 'src/components/Authenticated';
import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { PageLayout } from '@/types/resources';

function Integrations() {
  return (
    <>
      <Head>
        <title>Integrations | MiddlewareHQ</title>
      </Head>
      {/* <Content /> */}
    </>
  );
}

Integrations.getLayout = (page: PageLayout) => (
  <Authenticated>
    <ExtendedSidebarLayout>{page}</ExtendedSidebarLayout>
  </Authenticated>
);

export default Integrations;
