import { NextApiResponse } from 'next/types';

import { getOnBoardingState } from '@/api/resources/orgs/[org_id]/onboarding';
import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Table } from '@/constants/db';
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
  const [orgDetails, integrations] = await Promise.all([
    getOrgDetails(),
    getOrgIntegrations()
  ]);

  const onboardingState = await getOnBoardingState(orgDetails.id);
  res.send({
    org: { ...orgDetails, ...onboardingState, integrations } || {}
  });
});

export default endpoint.serve();

const getOrgDetails = async () => {
  return db(Table.Organization).select('*').then(getFirstRow);
};

const getOrgIntegrations = async () => {
  return db(Table.Integration)
    .select('name')
    .whereNotNull('access_token_enc_chunks')
    .then((rows) =>
      rows
        .map((row) => row.name)
        .reduce(
          (map: IntegrationsMap, name: string) => ({ ...map, [name]: true }),
          {} as IntegrationsMap
        )
    );
};
