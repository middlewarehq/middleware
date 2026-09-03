import axios from 'axios';
import * as yup from 'yup';

import { Endpoint } from '@/api-helpers/global';
import { Integration } from '@/constants/integrations';
import { dec } from '@/utils/auth-supplementary';
import { db } from '@/utils/db';

const pathSchema = yup.object().shape({
  org_id: yup.string().uuid().required()
});

const getSchema = yup.object().shape({
  search_text: yup.string().optional().nullable()
});

export type JiraProjectSearchResult = {
  id: string;
  key: string;
  name: string;
  idempotency_key: string;
  provider: Integration.JIRA;
};

const endpoint = new Endpoint(pathSchema);

// CLUSTOX: Jira integration, Phase 2 (project selection) -- live project
// search for the team-creation picker. Unlike the GitHub/GitLab repo
// search this mirrors (searchGithubRepos/gitlabSearch in
// pages/api/internal/[org_id]/utils.ts), there's no pre-synced OrgProject
// catalog to search yet in this phase -- Jira's own /project/search
// endpoint already supports server-side name/key filtering, so querying
// it directly here is simpler than standing up a sync job just to make
// this box searchable. See docs/JIRA_INTEGRATION_PROPOSAL.md.
endpoint.handle.GET(getSchema, async (req, res) => {
  const { org_id, search_text } = req.payload;

  const integration = await getJiraIntegration(org_id);
  const siteUrl = integration?.provider_meta?.site_url;
  const email = integration?.provider_meta?.email;
  const apiToken = integration?.access_token_enc_chunks
    ? dec(integration.access_token_enc_chunks)
    : null;

  if (!siteUrl || !email || !apiToken) {
    return res
      .status(404)
      .send({ error: 'Jira is not linked for this workspace' });
  }

  try {
    const response = await axios.get(
      `https://${siteUrl}/rest/api/3/project/search`,
      {
        auth: { username: email, password: apiToken },
        params: {
          maxResults: 50,
          ...(search_text ? { query: search_text } : {})
        },
        timeout: 8000
      }
    );

    const projects: JiraProjectSearchResult[] = (
      response.data?.values || []
    ).map((project: { id: string; key: string; name: string }) => ({
      id: String(project.id),
      key: project.key,
      name: project.name,
      // Scoped by org_id, not the bare Jira id -- two different orgs'
      // independent Jira sites can otherwise land on the same small,
      // site-local project id. Mirrors the same reasoning as the
      // OrgProject migration's idempotency_key comment.
      idempotency_key: `jira:${org_id}:${project.id}`,
      provider: Integration.JIRA
    }));

    return res.status(200).send(projects);
  } catch (error: any) {
    // Surfaced as a plain failure rather than a 500 -- an expired/revoked
    // Jira token, or Jira itself being briefly unreachable, isn't our own
    // server breaking.
    const status = error?.response?.status;
    return res.status(status === 401 || status === 403 ? 401 : 502).send({
      error: 'Could not reach Jira to search projects.'
    });
  }
});

export default endpoint.serve();

const getJiraIntegration = async (org_id: string) => {
  return db('Integration')
    .select('provider_meta', 'access_token_enc_chunks')
    .where({ org_id, name: Integration.JIRA })
    .first();
};
