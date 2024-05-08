import Head from 'next/head';
import { Authenticated } from 'src/components/Authenticated';
import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { useRedirectWithSession } from '@/constants/useRoute';
import { PageLayout } from '@/types/resources';

function Integrations() {
  useRedirectWithSession();
  return (
    <>
      <Head>
        <title>Server Admin</title>
      </Head>
    </>
  );
}

Integrations.getLayout = (page: PageLayout) => (
  <Authenticated>
    <ExtendedSidebarLayout>{page}</ExtendedSidebarLayout>
  </Authenticated>
);

export default Integrations;
