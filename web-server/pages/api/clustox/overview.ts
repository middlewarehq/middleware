import * as yup from 'yup';

import { handleRequest } from '@/api-helpers/axios';
import { Endpoint } from '@/api-helpers/global';
import { assertRole } from '@/auth/guard';
import { listWorkspaceSummaries } from '@/auth/queries';
import { Table } from '@/constants/db';
import { db } from '@/utils/db';

type LeadTime = { lead_time: number; pr_count: number };
type DeployFreq = {
  total_deployments: number;
  avg_daily_deployment_frequency: number;
};

const schema = yup.object().shape({
  from_time: yup.string().required(),
  to_time: yup.string().required()
});

/**
 * DORA metrics rolled up across every workspace.
 *
 * The dashboards are per team, and a team belongs to a workspace, so a
 * superadmin comparing workspaces would otherwise have to switch into each one
 * and read them off individually.
 *
 * Metrics are fetched per team and combined per workspace. Lead time is
 * weighted by pull request count rather than averaged flat -- a team with 200
 * PRs and one with 3 do not contribute equally, and a flat mean would let a
 * tiny team swing a workspace's figure. This matches how upstream aggregates
 * across a team's repositories.
 */
const endpoint = new Endpoint(schema);

endpoint.handle.GET(schema, async (req, res) => {
  assertRole((req as any).session, 'SUPERADMIN');

  const { from_time, to_time } = req.payload;
  const workspaces = await listWorkspaceSummaries();

  const teams = await db(Table.Team)
    .where('is_deleted', false)
    .select('id', 'org_id', 'name');

  const rows = await Promise.all(
    workspaces.map(async (w) => {
      const wsTeams = teams.filter((t: any) => t.org_id === w.id);

      const perTeam = await Promise.all(
        wsTeams.map(async (t: any) => {
          try {
            const [lead, deploy] = await Promise.all([
              handleRequest<LeadTime>(`/teams/${t.id}/lead_time`, {
                params: { from_time, to_time }
              }),
              handleRequest<DeployFreq>(`/teams/${t.id}/deployment_frequency`, {
                params: { from_time, to_time }
              })
            ]);
            return { lead, deploy };
          } catch {
            // One team failing must not blank the whole workspace, for the
            // same reason a failing workspace does not stop a sync.
            return null;
          }
        })
      );

      const ok = perTeam.filter(Boolean) as { lead: LeadTime; deploy: DeployFreq }[];

      const prCount = ok.reduce((n, r) => n + (r.lead.pr_count ?? 0), 0);
      const deployments = ok.reduce(
        (n, r) => n + (r.deploy.total_deployments ?? 0),
        0
      );

      // Weighted by PR count. Undefined rather than 0 when there is nothing to
      // average -- "no data" and "zero" are different claims, and conflating
      // them is what makes a dashboard untrustworthy.
      const leadTime =
        prCount > 0
          ? ok.reduce(
              (sum, r) => sum + (r.lead.lead_time ?? 0) * (r.lead.pr_count ?? 0),
              0
            ) / prCount
          : null;

      return {
        id: w.id,
        name: w.name,
        ownerEmail: w.ownerEmail,
        hasIntegration: w.hasIntegration,
        teamCount: wsTeams.length,
        repoCount: w.repoCount,
        prCount,
        deployments,
        leadTimeSeconds: leadTime
      };
    })
  );

  res.send(rows);
});

export default endpoint.serve();
