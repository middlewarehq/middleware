import { LinkOff } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  useTheme
} from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { Integration } from '@/constants/integrations';
import { useAuth } from '@/hooks/useAuth';
// CLUSTOX: server-resolved workspace, consistent with ClustoxJenkinsSetup.
import { useClustoxUser } from '@/hooks/useClustoxUser';
import { readApiError } from '@/utils/api-error';

type JenkinsJob = { name: string; full_name: string; url: string };
type WorkspaceRepo = { id: string; name: string; provider: Integration };
type JenkinsMapping = {
  repo_workflow_id: string;
  org_repo_id: string;
  job_full_name: string;
  repo_name: string;
};
type Pending =
  | {
      action: 'map';
      repoId: string;
      repoName: string;
      jobFullName: string;
      deactivatesWorkflows: boolean;
      teamCount: number;
    }
  | {
      action: 'unmap';
      repoId: string;
      repoName: string;
      jobFullName: string;
      repoWorkflowId: string;
      teamCount: number;
    };

const codeProviders = [
  Integration.GITHUB,
  Integration.GITLAB,
  Integration.BITBUCKET
];

type TeamReposResponse = {
  teamReposMap: Record<string, { id: string; repo_workflows?: unknown[] }[]>;
};

// CLUSTOX: the change is per repo, not per team, so it lands on every team
// tracking the repo -- including teams this admin is not currently looking at.
const everyTeamSentence = (teamCount: number) =>
  `This affects every team tracking this repo${
    teamCount > 0
      ? ` (${teamCount === 1 ? '1 team' : `${teamCount} teams`})`
      : ''
  }, not only the team you are viewing.`;

// CLUSTOX: the server's own words whenever it sent any, because the cases it
// reports are ones retrying cannot fix -- a 409 means another workflow already
// holds this job id, and "try again" is actively wrong advice there. A 5xx or a
// dropped connection carries nothing to show, so those keep the fallback.
const mutationError = (err: unknown, fallback: string) => {
  const { status, message } = readApiError(err);
  return status && status < 500 && message ? message : fallback;
};

/**
 * CLUSTOX: maps each repo to the Jenkins job whose builds count as its
 * deployments.
 *
 * Selections are read back from the server on every load, so a mapped repo
 * still reads as mapped after a reload. It used to show "Select a Jenkins job"
 * for a repo that was mapped and ingesting builds, which reads as a lost
 * configuration and invites an admin to map it a second time.
 */
export const ClustoxJenkinsMapping = () => {
  const theme = useTheme();
  const { orgId: contextOrgId } = useAuth();
  const { orgId: sessionOrgId } = useClustoxUser();
  const orgId = sessionOrgId ?? contextOrgId;

  const [repos, setRepos] = useState<WorkspaceRepo[]>([]);
  const [jobs, setJobs] = useState<JenkinsJob[]>([]);
  // CLUSTOX: the live mappings, keyed by repo. The backend allows one active
  // deployment source per repo, so a repo has at most one entry here.
  const [mappings, setMappings] = useState<Record<string, JenkinsMapping>>({});
  // CLUSTOX: repos whose active workflow could be double-counted with a new
  // Jenkins mapping. Sourced from teams/v2's repo_workflows, the only
  // existing endpoint that already joins OrgRepo with active workflow rows --
  // it does not expose which provider the active workflow belongs to, so
  // this is "has an active workflow-based deployment source" rather than
  // strictly "has an active GitHub Actions workflow".
  const [reposWithActiveWorkflow, setReposWithActiveWorkflow] = useState<
    Set<string>
  >(new Set());
  // CLUSTOX: how many teams track each repo. Mapping switches the deployment
  // source for all of them, and an admin looking at one team's numbers has no
  // other way to know he is changing what the other teams see.
  const [teamCounts, setTeamCounts] = useState<Record<string, number>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [savingRepoId, setSavingRepoId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const fetchMappings = useCallback(async () => {
    const res = await handleApi<{ mappings: JenkinsMapping[] }>(
      '/clustox/jenkins/mappings',
      { params: { org_id: orgId } }
    );
    return Object.fromEntries(
      (res.mappings || []).map((mapping) => [mapping.org_repo_id, mapping])
    ) as Record<string, JenkinsMapping>;
  }, [orgId]);

  const fetchTeamState = useCallback(async () => {
    const res = await handleApi<TeamReposResponse>(
      `/resources/orgs/${orgId}/teams/v2`,
      { params: { providers: codeProviders } }
    );

    const withWorkflow = new Set<string>();
    const counts: Record<string, number> = {};
    Object.entries(res.teamReposMap || {}).forEach(([teamId, teamRepos]) => {
      teamRepos.forEach((repo) => {
        if (repo.repo_workflows?.length) withWorkflow.add(repo.id);
        // teams/v2 left-joins TeamRepos, so repos belonging to no team arrive
        // under a null key. Counting that bucket would tell an admin one team
        // tracks a repo that none does.
        if (teamId && teamId !== 'null' && teamId !== 'undefined')
          counts[repo.id] = (counts[repo.id] || 0) + 1;
      });
    });
    return { withWorkflow, counts };
  }, [orgId]);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setFailed(false);
    try {
      const [repoRows, jobsRes, mappingsByRepo, teamState] = await Promise.all([
        handleApi<WorkspaceRepo[]>(`/resources/orgs/${orgId}/repos`),
        handleApi<{ jobs: JenkinsJob[] }>('/clustox/jenkins/jobs', {
          params: { org_id: orgId }
        }),
        fetchMappings(),
        fetchTeamState()
      ]);

      setRepos(repoRows || []);
      setJobs(jobsRes.jobs || []);
      setMappings(mappingsByRepo);
      setReposWithActiveWorkflow(teamState.withWorkflow);
      setTeamCounts(teamState.counts);
    } catch (e) {
      console.error('Failed to load Jenkins mapping data', e);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [fetchMappings, fetchTeamState, orgId]);

  useEffect(() => {
    load();
  }, [load]);

  // CLUSTOX: re-read what the server now holds after a mapping changed, rather
  // than patching local state to match a guess. Mapping and unmapping both move
  // rows this screen only sees indirectly -- displaced workflows, restored
  // ones, deployment types -- and the repo_workflow_id needed to undo a fresh
  // mapping exists nowhere until it is fetched. The Jenkins job list is left
  // alone: it costs a round trip to Jenkins and nothing here changes it.
  const refreshMappingState = useCallback(async () => {
    const [mappingsByRepo, teamState] = await Promise.all([
      fetchMappings(),
      fetchTeamState()
    ]);
    setMappings(mappingsByRepo);
    setReposWithActiveWorkflow(teamState.withWorkflow);
    setTeamCounts(teamState.counts);
  }, [fetchMappings, fetchTeamState]);

  const submitMapping = useCallback(
    async (repoId: string, jobFullName: string) => {
      setRowErrors((errs) => ({ ...errs, [repoId]: '' }));
      setSavingRepoId(repoId);
      try {
        await handleApi('/clustox/jenkins/mappings', {
          method: 'post',
          data: {
            org_id: orgId,
            org_repo_id: repoId,
            job_full_name: jobFullName
          }
        });
        await refreshMappingState();
      } catch (e) {
        console.error('Failed to map Jenkins job', e);
        setRowErrors((errs) => ({
          ...errs,
          [repoId]: mutationError(e, 'Could not save this mapping. Try again.')
        }));
      } finally {
        setSavingRepoId(null);
      }
    },
    [orgId, refreshMappingState]
  );

  const submitUnmapping = useCallback(
    async (repoId: string, repoWorkflowId: string) => {
      setRowErrors((errs) => ({ ...errs, [repoId]: '' }));
      setSavingRepoId(repoId);
      try {
        await handleApi('/clustox/jenkins/mappings', {
          method: 'delete',
          data: { org_id: orgId, repo_workflow_id: repoWorkflowId }
        });
        await refreshMappingState();
      } catch (e) {
        console.error('Failed to remove Jenkins mapping', e);
        setRowErrors((errs) => ({
          ...errs,
          [repoId]: mutationError(
            e,
            'Could not remove this mapping. Try again.'
          )
        }));
      } finally {
        setSavingRepoId(null);
      }
    },
    [orgId, refreshMappingState]
  );

  const askToUnmap = useCallback(
    (repo: WorkspaceRepo) => {
      const mapping = mappings[repo.id];
      if (!mapping) return;
      setPending({
        action: 'unmap',
        repoId: repo.id,
        repoName: repo.name,
        jobFullName: mapping.job_full_name,
        repoWorkflowId: mapping.repo_workflow_id,
        teamCount: teamCounts[repo.id] || 0
      });
    },
    [mappings, teamCounts]
  );

  const handleSelect = useCallback(
    (repo: WorkspaceRepo, jobFullName: string) => {
      // The empty option on a mapped row means "stop using Jenkins here", which
      // is the same destructive change as the explicit button beside it.
      if (!jobFullName) {
        if (mappings[repo.id]) askToUnmap(repo);
        return;
      }
      if (jobFullName === mappings[repo.id]?.job_full_name) return;

      // CLUSTOX: confirmed for every repo, not only those with a workflow to
      // displace. Mapping now also switches the repo to workflow-based
      // deployments for every team tracking it, so even a repo with no active
      // workflow changes where its deployment numbers come from.
      setPending({
        action: 'map',
        repoId: repo.id,
        repoName: repo.name,
        jobFullName,
        deactivatesWorkflows:
          reposWithActiveWorkflow.has(repo.id) && !mappings[repo.id],
        teamCount: teamCounts[repo.id] || 0
      });
    },
    [askToUnmap, mappings, reposWithActiveWorkflow, teamCounts]
  );

  const confirmPending = useCallback(async () => {
    if (!pending) return;
    if (pending.action === 'map')
      await submitMapping(pending.repoId, pending.jobFullName);
    else await submitUnmapping(pending.repoId, pending.repoWorkflowId);
    setPending(null);
  }, [pending, submitMapping, submitUnmapping]);

  const noJobs = useMemo(() => !loading && !jobs.length, [loading, jobs]);

  return (
    <FlexBox col gap={2} minWidth="600px">
      {failed && (
        <Alert severity="error">
          Could not load repos or Jenkins jobs. Try again in a moment.
        </Alert>
      )}

      {noJobs && !failed && (
        <Alert severity="warning">
          Jenkins didn&apos;t return any jobs for this instance.
        </Alert>
      )}

      {loading ? (
        <FlexBox p={4} justifyCenter>
          <CircularProgress />
        </FlexBox>
      ) : (
        <TableContainer
          sx={{
            border: `1px solid ${theme.colors.alpha.trueWhite[10]}`,
            borderRadius: 1.5,
            overflow: 'hidden'
          }}
        >
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Repository</TableCell>
                <TableCell>Jenkins job</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {repos.map((repo) => (
                <TableRow key={repo.id} hover>
                  <TableCell>
                    <FlexBox col>
                      <Line medium>{repo.name}</Line>
                      <Line small secondary>
                        {repo.provider}
                      </Line>
                    </FlexBox>
                  </TableCell>
                  <TableCell>
                    <FlexBox alignCenter gap1>
                      <TextField
                        select
                        size="small"
                        sx={{ minWidth: 280 }}
                        disabled={savingRepoId === repo.id || !jobs.length}
                        value={mappings[repo.id]?.job_full_name || ''}
                        onChange={(e) =>
                          handleSelect(repo, e.target.value as string)
                        }
                        SelectProps={{ displayEmpty: true }}
                      >
                        <MenuItem value="">
                          <em>Select a Jenkins job</em>
                        </MenuItem>
                        {jobs.map((job) => (
                          <MenuItem key={job.full_name} value={job.full_name}>
                            {job.full_name}
                          </MenuItem>
                        ))}
                      </TextField>
                      {savingRepoId === repo.id && (
                        <CircularProgress size={16} />
                      )}
                      {mappings[repo.id] && savingRepoId !== repo.id && (
                        <>
                          <Line small success>
                            Mapped
                          </Line>
                          <Tooltip title="Remove this mapping">
                            <IconButton
                              size="small"
                              aria-label={`Remove the Jenkins mapping for ${repo.name}`}
                              onClick={() => askToUnmap(repo)}
                            >
                              <LinkOff fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </>
                      )}
                    </FlexBox>
                    {rowErrors[repo.id] && (
                      <Line error tiny mt={1 / 2}>
                        {rowErrors[repo.id]}
                      </Line>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {!repos.length && (
                <TableRow>
                  <TableCell colSpan={2}>
                    <Line secondary>No repos in this workspace yet.</Line>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Dialog open={!!pending} onClose={() => setPending(null)}>
        <DialogTitle>
          {pending?.action === 'unmap'
            ? `Remove ${pending?.repoName}'s Jenkins mapping?`
            : `Map ${pending?.repoName} to Jenkins?`}
        </DialogTitle>
        <DialogContent>
          <FlexBox col gap={1}>
            {pending?.action === 'unmap' ? (
              <>
                <Line>
                  {pending.repoName} will stop counting runs of{' '}
                  <Line medium>{pending.jobFullName}</Line> as deployments, and
                  go back to the deployment source it had before it was mapped —
                  its GitHub Actions workflows if this mapping switched any off,
                  otherwise merged pull requests.
                </Line>
                <Line>{everyTeamSentence(pending.teamCount)}</Line>
                <Line secondary small>
                  Builds already ingested from Jenkins are kept. You can map the
                  job again at any time.
                </Line>
              </>
            ) : (
              <>
                <Line>
                  {pending?.repoName} will start counting runs of{' '}
                  <Line medium>{pending?.jobFullName}</Line> as its deployments,
                  instead of counting merged pull requests. Deployment frequency
                  and lead time will be measured from Jenkins from now on.
                </Line>
                {pending?.action === 'map' && pending.deactivatesWorkflows && (
                  <Line>
                    This repo&apos;s active GitHub Actions deployment workflows
                    will be switched off so the same deployment isn&apos;t
                    counted twice.
                  </Line>
                )}
                <Line>{everyTeamSentence(pending?.teamCount ?? 0)}</Line>
                <Line secondary small>
                  You can undo this by removing the mapping.
                </Line>
              </>
            )}
          </FlexBox>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            color="secondary"
            onClick={() => setPending(null)}
          >
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            color={pending?.action === 'unmap' ? 'error' : 'primary'}
            loading={savingRepoId === pending?.repoId}
            onClick={confirmPending}
          >
            {pending?.action === 'unmap' ? 'Remove mapping' : 'Map job'}
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </FlexBox>
  );
};
