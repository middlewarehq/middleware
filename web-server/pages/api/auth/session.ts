import { NextApiResponse } from 'next/types';

import { getLastSyncedAtForCodeProvider } from '@/api/internal/[org_id]/sync_repos';
import { getOnBoardingState } from '@/api/resources/orgs/[org_id]/onboarding';
import { Endpoint, nullSchema } from '@/api-helpers/global';
import { CODE_PROVIDER_INTEGRATIONS_MAP } from '@/constants/api';
import { Row, Table } from '@/constants/db';
import { IntegrationsLinkedAtMap } from '@/types/resources';
import { db, getFirstRow } from '@/utils/db';

const endpoint = new Endpoint(nullSchema);

const getRemainingCookies = (key: string, res: NextApiResponse) =>
  ((res.getHeader('set-cookie') || []) as string[]).filter(
    (cookie) => !cookie.startsWith(key)
  );
const unsafeCookieAttrs = ['Secure', 'Path=/'].join(';');
const cookieAttrs = `${unsafeCookieAttrs};HttpOnly`;
const cookieDeleteAttr = 'Expires=Thu, 01 Jan 1970 00:00:00 GMT';

export const setUserIdCookie = (id: string, res: NextApiResponse) => {
  res.setHeader('set-cookie', [
    ...getRemainingCookies('application-user-id', res),
    `application-user-id=${id};${cookieAttrs}`
  ]);
};

export const delUserIdCookie = (res: NextApiResponse) => {
  res.setHeader('set-cookie', [
    ...getRemainingCookies('application-user-id', res),
    `application-user-id=;${cookieAttrs};${cookieDeleteAttr}`
  ]);
};

endpoint.handle.GET(nullSchema, async (_req, res) => {
  const [orgDetails, integrationsLinkedAtMap] = await Promise.all([
    getOrgDetails(),
    getOrgIntegrations()
  ]);

  const [onboardingState, codeProviderLastSyncedAt] = await Promise.all([
    getOnBoardingState(orgDetails.id),
    getLastSyncedAtForCodeProvider(orgDetails.id)
  ]);
  const integrations = {} as IntegrationsMap;
  Object.entries(integrationsLinkedAtMap).forEach(
    ([integrationName, integrationLinkedAt]) => {
      integrations[integrationName as keyof IntegrationsMap] = {
        integrated: true,
        linked_at: integrationLinkedAt,
        last_synced_at: CODE_PROVIDER_INTEGRATIONS_MAP[
          integrationName as keyof typeof CODE_PROVIDER_INTEGRATIONS_MAP
        ]
          ? codeProviderLastSyncedAt
          : null
      };
    }
  );

  res.send({
    org:
      {
        ...orgDetails,
        ...onboardingState,
        integrations
      } || {}
  });
});

export default endpoint.serve();

const getOrgDetails = async () => {
  return db(Table.Organization).select('*').then(getFirstRow);
};

export const getOrgIntegrations = async () => {
  return db(Table.Integration)
    .select('*')
    .whereNotNull('access_token_enc_chunks')
    .then(async (rows) => {
      const integrationsLinkedAtMap = rows.reduce(
        (map: IntegrationsLinkedAtMap, r: Row<'Integration'>) => ({
          ...map,
          [r.name]: r.created_at
        }),
        {} as IntegrationsLinkedAtMap
      );

      return integrationsLinkedAtMap;
    });
};
