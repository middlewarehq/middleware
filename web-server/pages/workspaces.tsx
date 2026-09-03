import {
  CheckCircleTwoTone,
  ErrorTwoTone,
  HelpOutlineTwoTone,
  LinkOffTwoTone,
  SyncTwoTone,
  WorkspacesTwoTone
} from '@mui/icons-material';
import {
  Alert,
  Button,
  Chip,
  CircularProgress,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  Tooltip,
  Typography,
  useTheme
} from '@mui/material';
import { formatDistanceToNow } from 'date-fns';
import Head from 'next/head';
import { useSnackbar } from 'notistack';
import { useCallback, useEffect, useState } from 'react';
import ExtendedSidebarLayout from 'src/layouts/ExtendedSidebarLayout';

import { BenchmarkSettingsForm } from '@/components/BenchmarkSettingsForm';
import { ClustoxWorkspaceMetrics } from '@/components/ClustoxWorkspaceMetrics';
import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { PageWrapper } from '@/content/PullRequests/PageWrapper';
import { useClustoxUser } from '@/hooks/useClustoxUser';
import { PageLayout } from '@/types/resources';

type SyncStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'SKIPPED';

type Workspace = {
  id: string;
  name: string;
  ownerEmail: string | null;
  hasIntegration: boolean;
  repoCount: number;
  teamCount: number;
  lastSync: {
    status: SyncStatus;
    finished_at: string | null;
    started_at: string | null;
    detail: string | null;
  } | null;
};

const Mono = ({ children }: { children: React.ReactNode }) => (
  <Typography
    component="span"
    sx={{
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
      fontSize: '0.8125rem'
    }}
  >
    {children}
  </Typography>
);

const relative = (iso: string | null) => {
  if (!iso) return 'never';
  try {
    return `${formatDistanceToNow(new Date(iso))} ago`;
  } catch {
    return 'unknown';
  }
};

function WorkspacesPage() {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  const { isSuperadmin, loading: userLoading } = useClustoxUser();

  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [tab, setTab] = useState<'health' | 'metrics' | 'benchmarks'>('health');

  const load = useCallback(async () => {
    const res = await fetch('/api/clustox/workspace-status');
    if (res.ok) setWorkspaces(await res.json());
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const syncNow = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/clustox/sync-now', { method: 'POST' });
      if (!res.ok) throw new Error('sync failed');
      const body = await res.json();
      enqueueSnackbar(body.message ?? 'Sync finished', {
        variant: 'success',
        autoHideDuration: 6000
      });
      await load();
    } catch {
      enqueueSnackbar('Could not reach the sync server', { variant: 'error' });
    } finally {
      setSyncing(false);
    }
  };

  const statusChip = (w: Workspace) => {
    if (!w.hasIntegration)
      return (
        <Tooltip title="No code provider connected, so there is nothing to sync">
          <Chip
            size="small"
            variant="outlined"
            icon={<LinkOffTwoTone />}
            label="Not connected"
          />
        </Tooltip>
      );

    if (!w.lastSync)
      return (
        <Tooltip title="No sync has run for this workspace yet">
          <Chip
            size="small"
            variant="outlined"
            icon={<HelpOutlineTwoTone />}
            label="Never synced"
          />
        </Tooltip>
      );

    if (w.lastSync.status === 'FAILED')
      return (
        <Tooltip title={w.lastSync.detail ?? 'Sync failed'}>
          <Chip
            size="small"
            color="error"
            icon={<ErrorTwoTone />}
            label="Failed"
          />
        </Tooltip>
      );

    if (w.lastSync.status === 'RUNNING')
      return <Chip size="small" icon={<SyncTwoTone />} label="Running" />;

    return (
      <Chip
        size="small"
        color="success"
        variant="outlined"
        icon={<CheckCircleTwoTone />}
        label="Synced"
      />
    );
  };

  if (loading || userLoading)
    return (
      <FlexBox p={6} justifyCenter>
        <CircularProgress />
      </FlexBox>
    );

  const failing = workspaces.filter((w) => w.lastSync?.status === 'FAILED');
  const unconnected = workspaces.filter((w) => !w.hasIntegration);

  return (
    <>
      <Head>
        <title>Workspaces | MiddlewareHQ</title>
      </Head>

      <FlexBox col gap={3} maxWidth="1100px">
        <FlexBox justifyBetween alignCenter flexWrap="wrap" gap={2}>
          <FlexBox col>
            <Line bigish bold>
              {workspaces.length}{' '}
              {workspaces.length === 1 ? 'workspace' : 'workspaces'}
            </Line>
            <Line small secondary>
              {failing.length > 0
                ? `${failing.length} failing to sync`
                : 'All connected workspaces syncing'}
            </Line>
          </FlexBox>

          {isSuperadmin && (
            <Button
              variant="contained"
              startIcon={<SyncTwoTone />}
              onClick={syncNow}
              disabled={syncing}
            >
              {syncing ? 'Syncing…' : 'Sync now'}
            </Button>
          )}
        </FlexBox>

        {failing.length > 0 && (
          <Alert severity="error">
            {failing.length === 1
              ? `${failing[0].name} failed its last sync.`
              : `${failing.length} workspaces failed their last sync.`}{' '}
            Their metrics are stale until it succeeds.
          </Alert>
        )}

        {unconnected.length > 0 && failing.length === 0 && (
          <Alert severity="info">
            {unconnected.length}{' '}
            {unconnected.length === 1 ? 'workspace has' : 'workspaces have'} no
            code provider connected yet, so{' '}
            {unconnected.length === 1 ? 'it has' : 'they have'} nothing to sync.
          </Alert>
        )}

        {isSuperadmin && (
          <Tabs
            value={tab}
            onChange={(_e, v) => setTab(v)}
            sx={{ borderBottom: 1, borderColor: 'divider' }}
          >
            <Tab value="health" label="Sync health" />
            <Tab value="metrics" label="DORA comparison" />
            <Tab value="benchmarks" label="Global benchmarks" />
          </Tabs>
        )}

        {isSuperadmin && tab === 'metrics' && <ClustoxWorkspaceMetrics />}

        {isSuperadmin && tab === 'benchmarks' && (
          <BenchmarkSettingsForm scope="global" />
        )}

        {(!isSuperadmin || tab === 'health') && (
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
                  <TableCell>Workspace</TableCell>
                  <TableCell width={150}>Last sync</TableCell>
                  <TableCell width={150}>When</TableCell>
                  <TableCell width={110} align="right">
                    Repos
                  </TableCell>
                  <TableCell width={110} align="right">
                    Teams
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {workspaces.map((w) => (
                  <TableRow key={w.id} hover>
                    <TableCell>
                      <FlexBox alignCenter gap={1.5}>
                        <WorkspacesTwoTone
                          fontSize="small"
                          sx={{ color: theme.colors.alpha.trueWhite[50] }}
                        />
                        <FlexBox col>
                          <Line medium>{w.name}</Line>
                          <Line small secondary>
                            <Mono>{w.ownerEmail ?? 'no owner'}</Mono>
                          </Line>
                        </FlexBox>
                      </FlexBox>
                    </TableCell>
                    <TableCell>{statusChip(w)}</TableCell>
                    <TableCell>
                      <Line small secondary>
                        {w.hasIntegration
                          ? relative(w.lastSync?.finished_at ?? null)
                          : '—'}
                      </Line>
                    </TableCell>
                    <TableCell align="right">
                      <Mono>{w.repoCount}</Mono>
                    </TableCell>
                    <TableCell align="right">
                      <Mono>{w.teamCount}</Mono>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {(!isSuperadmin || tab === 'health') && (
          <Line small secondary>
            Syncs run automatically every 30 minutes. A failed workspace does
            not affect the others.
          </Line>
        )}
      </FlexBox>
    </>
  );
}

WorkspacesPage.getLayout = (page: PageLayout) => (
  <ExtendedSidebarLayout>
    <PageWrapper
      title={
        <FlexBox gap={1} alignCenter>
          <WorkspacesTwoTone />
          Workspaces
        </FlexBox>
      }
      pageTitle="Workspaces"
      hideAllSelectors
      showEvenIfNoTeamSelected
      showDate={false}
    >
      {page}
    </PageWrapper>
  </ExtendedSidebarLayout>
);

export default WorkspacesPage;
