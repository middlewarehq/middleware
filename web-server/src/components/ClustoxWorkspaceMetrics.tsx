import {
  Alert,
  CircularProgress,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
  useTheme
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';

type Row = {
  id: string;
  name: string;
  ownerEmail: string | null;
  hasIntegration: boolean;
  teamCount: number;
  repoCount: number;
  prCount: number;
  deployments: number;
  leadTimeSeconds: number | null;
};

const WINDOWS = [
  { days: 7, label: 'Last 7 days' },
  { days: 30, label: 'Last 30 days' },
  { days: 90, label: 'Last 90 days' }
];

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

/** Seconds to the coarsest unit that still reads precisely. */
const duration = (seconds: number | null) => {
  if (seconds === null) return '—';
  const h = seconds / 3600;
  if (h < 1) return `${Math.round(seconds / 60)}m`;
  if (h < 48) return `${Math.round(h)}h`;
  return `${(h / 24).toFixed(1)}d`;
};

/**
 * CLUSTOX: DORA metrics across every workspace, for a superadmin.
 *
 * Without this, comparing workspaces means switching into each one and reading
 * its dashboard separately.
 */
export const ClustoxWorkspaceMetrics = () => {
  const theme = useTheme();
  const [rows, setRows] = useState<Row[]>([]);
  const [days, setDays] = useState(30);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);

    const to = new Date();
    const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
    const params = new URLSearchParams({
      // The analytics API rejects timestamps without timezone info.
      from_time: from.toISOString().replace('Z', '+00:00'),
      to_time: to.toISOString().replace('Z', '+00:00')
    });

    try {
      const res = await fetch(`/api/clustox/overview?${params}`);
      if (!res.ok) throw new Error('failed');
      setRows(await res.json());
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    load();
  }, [load]);

  const withData = rows.filter((r) => r.prCount > 0);

  return (
    <FlexBox col gap={2}>
      <FlexBox justifyBetween alignCenter flexWrap="wrap" gap={2}>
        <Line small secondary>
          {withData.length} of {rows.length} workspaces have activity in this
          window
        </Line>
        <TextField
          select
          size="small"
          value={days}
          sx={{ minWidth: 160 }}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          {WINDOWS.map((w) => (
            <MenuItem key={w.days} value={w.days}>
              {w.label}
            </MenuItem>
          ))}
        </TextField>
      </FlexBox>

      {failed && (
        <Alert severity="error">
          Could not load metrics. The analytics server may be unreachable.
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
                <TableCell>Workspace</TableCell>
                <TableCell align="right" width={130}>
                  Lead time
                </TableCell>
                <TableCell align="right" width={130}>
                  Deployments
                </TableCell>
                <TableCell align="right" width={110}>
                  PRs
                </TableCell>
                <TableCell align="right" width={110}>
                  Teams
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const idle = r.prCount === 0;
                return (
                  <TableRow key={r.id} hover>
                    <TableCell>
                      <FlexBox col>
                        <Line medium>{r.name}</Line>
                        <Line small secondary>
                          <Mono>{r.ownerEmail ?? 'no owner'}</Mono>
                        </Line>
                      </FlexBox>
                    </TableCell>
                    <TableCell align="right">
                      {idle ? (
                        <Line small secondary>
                          {r.hasIntegration ? 'no activity' : 'not connected'}
                        </Line>
                      ) : (
                        <Mono>{duration(r.leadTimeSeconds)}</Mono>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <Mono>{idle ? '—' : r.deployments}</Mono>
                    </TableCell>
                    <TableCell align="right">
                      <Mono>{idle ? '—' : r.prCount}</Mono>
                    </TableCell>
                    <TableCell align="right">
                      <Mono>{r.teamCount}</Mono>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      <Line small secondary>
        Lead time is weighted by pull request count, so a workspace with few
        merges cannot skew the comparison. Workspaces with no merged pull
        requests in the window show no figure rather than a zero.
      </Line>
    </FlexBox>
  );
};
