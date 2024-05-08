import { Endpoint, nullSchema } from '@/api-helpers/global';
import { Table } from '@/constants/db';
import { Integration } from '@/constants/integrations';
import { validateGithubToken } from '@/utils/auth-supplementary';
import { db } from '@/utils/db';

const endpoint = new Endpoint(nullSchema);

endpoint.handle.GET(nullSchema, async (_req, res) => {
  const integrations = await getOrgIntegrations();

  res.send(integrations);
});

export default endpoint.serve();

const getOrgIntegrations = async () => {
  return db(Table.Integration)
    .select('*')
    .whereNotNull('access_token_enc_chunks')
    .then(async (rows) => {
      const integrations = rows
        .map((row) => row.name)
        .reduce(
          (map: IntegrationsMap, name: string) => ({ ...map, [name]: true }),
          {} as IntegrationsMap
        );
      if (integrations.github) {
        integrations.github = await validateGithubToken(
          rows.find((row) => row.name === Integration.GITHUB)
            ?.access_token_enc_chunks
        );
      }

      return integrations;
    });
};
