import { LoadingButton } from '@mui/lab';
import {
  Alert,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
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

type JenkinsJob = { name: string; full_name: string; url: string };
type WorkspaceRepo = { id: string; name: string; provider: Integration };
type Pending = { repoId: string; repoName: string; jobFullName: string };

/**
 * CLUSTOX: there is no endpoint to list existing repo-to-job mappings, only
 * to create (POST) or remove (DELETE, given a repo_workflow_id this UI never
 * receives back) one. So this table's selections reflect what has been
 * mapped in the current session, not necessarily what a prior session saved
 * -- the mapping itself does persist server-side even though this screen
 * cannot re-display it after a reload.
 */
export const ClustoxJenkinsMapping = () => {
  const theme = useTheme();
  const { orgId: contextOrgId } = useAuth();
  const { orgId: sessionOrgId } = useClustoxUser();
  const orgId = sessionOrgId ?? contextOrgId;

  const [repos, setRepos] = useState<WorkspaceRepo[]>([]);
  const [jobs, setJobs] = useState<JenkinsJob[]>([]);
  // CLUSTOX: repos whose active workflow could be double-counted with a new
  // Jenkins mapping. Sourced from teams/v2's repo_workflows, the only
  // existing endpoint that already joins OrgRepo with active workflow rows --
  // it does not expose which provider the active workflow belongs to, so
  // this is "has an active workflow-based deployment source" rather than
  // strictly "has an active GitHub Actions workflow".
  const [reposWithActiveWorkflow, setReposWithActiveWorkflow] = useState<
    Set<string>
  >(new Set());
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [savingRepoId, setSavingRepoId] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    if (!orgId) return;
    setLoading(true);
    setFailed(false);
    try {
      const codeProviders = [
        Integration.GITHUB,
        Integration.GITLAB,
        Integration.BITBUCKET
      ];
      const [repoRows, jobsRes, teamsRes] = await Promise.all([
        handleApi<WorkspaceRepo[]>(`/resources/orgs/${orgId}/repos`),
        handleApi<{ jobs: JenkinsJob[] }>('/clustox/jenkins/jobs', {
          params: { org_id: orgId }
        }),
        handleApi<{
          teamReposMap: Record<
            string,
            { id: string; repo_workflows?: unknown[] }[]
          >;
        }>(`/resources/orgs/${orgId}/teams/v2`, {
          params: { providers: codeProviders }
        })
      ]);

      setRepos(repoRows || []);
      setJobs(jobsRes.jobs || []);

      const withWorkflow = new Set<string>();
      Object.values(teamsRes.teamReposMap || {}).forEach((teamRepos) => {
        teamRepos.forEach((repo) => {
          if (repo.repo_workflows?.length) withWorkflow.add(repo.id);
        });
      });
      setReposWithActiveWorkflow(withWorkflow);
    } catch (e) {
      console.error('Failed to load Jenkins mapping data', e);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  useEffect(() => {
    load();
  }, [load]);

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
        setSelections((s) => ({ ...s, [repoId]: jobFullName }));
        // CLUSTOX: the backend just deactivated this repo's GitHub Actions
        // workflows as part of creating the mapping.
        setReposWithActiveWorkflow((prev) => {
          const next = new Set(prev);
          next.delete(repoId);
          return next;
        });
      } catch (e) {
        console.error('Failed to map Jenkins job', e);
        setRowErrors((errs) => ({
          ...errs,
          [repoId]: 'Could not save this mapping. Try again.'
        }));
      } finally {
        setSavingRepoId(null);
      }
    },
    [orgId]
  );

  const handleSelect = useCallback(
    (repo: WorkspaceRepo, jobFullName: string) => {
      if (!jobFullName) return;
      if (reposWithActiveWorkflow.has(repo.id)) {
        setPending({ repoId: repo.id, repoName: repo.name, jobFullName });
        return;
      }
      submitMapping(repo.id, jobFullName);
    },
    [reposWithActiveWorkflow, submitMapping]
  );

  const confirmPending = useCallback(async () => {
    if (!pending) return;
    await submitMapping(pending.repoId, pending.jobFullName);
    setPending(null);
  }, [pending, submitMapping]);

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
                        value={selections[repo.id] || ''}
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
                      {selections[repo.id] &&
                        savingRepoId !== repo.id &&
                        !rowErrors[repo.id] && (
                          <Line small success>
                            Mapped
                          </Line>
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
        <DialogTitle>Map {pending?.repoName} to Jenkins?</DialogTitle>
        <DialogContent>
          <Line>
            Mapping a Jenkins job stops counting this repo&apos;s GitHub Actions
            runs as deployments, so they aren&apos;t counted twice. You can undo
            this by removing the mapping.
          </Line>
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
            loading={savingRepoId === pending?.repoId}
            onClick={confirmPending}
          >
            Map job
          </LoadingButton>
        </DialogActions>
      </Dialog>
    </FlexBox>
  );
};
