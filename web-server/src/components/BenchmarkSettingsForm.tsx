import { LoadingButton } from '@mui/lab';
import {
  Alert,
  Button,
  CircularProgress,
  Divider,
  TextField
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { FC, useCallback, useEffect, useMemo, useState } from 'react';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { useDoraMetricsFetchArgs } from '@/hooks/useDoraMetricsFetchArgs';
import {
  useSingleTeamConfig,
  useStateBranchConfig
} from '@/hooks/useStateTeamConfig';
import { fetchTeamDoraMetrics } from '@/slices/dora_metrics';
import { useDispatch, useSelector } from '@/store';
import {
  ActiveBranchMode,
  FetchTeamSettingsAPIResponse
} from '@/types/resources';
import { BenchmarkMetric } from '@/utils/benchmarks';

import { FlexBox } from './FlexBox';
import { Line } from './Text';

// CLUSTOX: the API stores seconds for these two, but nobody thinks in
// seconds when setting a target. Hours are entered/displayed; converted at
// the read/write boundary only, so the rest of the component (validation,
// dirty-checking, payload building) never has to know which unit a metric is
// really in.
const SECONDS_PER_HOUR = 3600;
// CLUSTOX: `lines_of_code` is deliberately NOT in here. Its unit is lines,
// not hours -- adding it would multiply every target the admin types by 3600
// on save and divide it back on load, so a 200-line target would be stored
// as 720000 and compared against an actual measured in lines.
const DURATION_METRICS: ReadonlySet<BenchmarkMetric> = new Set([
  'lead_time',
  'mean_time_to_recovery'
]);

const METRIC_LABEL: Record<BenchmarkMetric, string> = {
  lead_time: 'Lead time',
  deployment_frequency: 'Deployment frequency',
  change_failure_rate: 'Change failure rate',
  mean_time_to_recovery: 'Mean time to recovery',
  // CLUSTOX: "Average PR size" rather than "Lines of code" -- the target is
  // per merged PR, and an admin reading the raw metric name would reasonably
  // type a weekly total into it.
  lines_of_code: 'Average PR size'
};

// CLUSTOX: derived from METRIC_LABEL rather than written out again, because a
// `Record<BenchmarkMetric, ...>` is exhaustiveness-checked by tsc and a bare
// `BenchmarkMetric[]` is not. Spelled as its own array, a sixth metric added
// to the union but forgotten here would compile clean and simply never render
// a field -- silently unconfigurable, with no error anywhere to find.
const METRICS = Object.keys(METRIC_LABEL) as BenchmarkMetric[];

const UNIT_LABEL: Record<BenchmarkMetric, string> = {
  lead_time: 'hours',
  deployment_frequency: 'per week',
  change_failure_rate: '%',
  mean_time_to_recovery: 'hours',
  lines_of_code: 'lines'
};

type BenchmarkSettingValues = Record<BenchmarkMetric, number | null>;
type FormValues = Record<BenchmarkMetric, string>;

const EMPTY_FORM_VALUES: FormValues = {
  lead_time: '',
  deployment_frequency: '',
  change_failure_rate: '',
  mean_time_to_recovery: '',
  lines_of_code: ''
};

/** seconds/percent/deployments-per-week -> the string shown in the input. */
const toDisplayValue = (metric: BenchmarkMetric, apiValue: number | null) => {
  if (apiValue === null || apiValue === undefined) return '';
  const display = DURATION_METRICS.has(metric)
    ? apiValue / SECONDS_PER_HOUR
    : apiValue;
  return String(display);
};

/**
 * The string in the input -> the payload value, or `undefined` to omit the
 * key entirely.
 *
 * CLUSTOX: an empty string must become "key absent", never "key: 0" -- the
 * backend treats an absent key as "inherit" and an explicit 0 as a real
 * target of zero. Collapsing empty to 0 here would silently turn every
 * cleared field into "fail this metric at every value above zero" the next
 * time the form is saved.
 */
const toApiValue = (
  metric: BenchmarkMetric,
  raw: string
): number | undefined => {
  if (raw.trim() === '') return undefined;
  const n = Number(raw);
  if (Number.isNaN(n)) return undefined;
  return DURATION_METRICS.has(metric) ? n * SECONDS_PER_HOUR : n;
};

const roundForDisplay = (n: number) => Math.round(n * 100) / 100;

/** `24h (default)` / `3.5/week (default)` / `12% (default)`. */
const formatInheritedPlaceholder = (
  metric: BenchmarkMetric,
  apiValue: number
): string => {
  const display = DURATION_METRICS.has(metric)
    ? apiValue / SECONDS_PER_HOUR
    : apiValue;
  const n = roundForDisplay(display);
  switch (metric) {
    case 'lead_time':
    case 'mean_time_to_recovery':
      return `${n}h (default)`;
    case 'deployment_frequency':
      return `${n}/week (default)`;
    case 'change_failure_rate':
      return `${n}% (default)`;
    case 'lines_of_code':
      return `${n} lines (default)`;
  }
};

/** Mirrors `validate_benchmark_payload` on the backend, for instant feedback
 * without a round trip. The server is still the source of truth -- see the
 * catch block in `handleSave`, which surfaces whatever it rejects even when
 * this check passed. */
const clientErrorFor = (
  metric: BenchmarkMetric,
  raw: string
): string | null => {
  if (raw.trim() === '') return null;
  const n = Number(raw);
  if (Number.isNaN(n)) return 'Must be a number';
  if (n < 0) return 'Must not be negative';
  if (metric === 'change_failure_rate' && n > 100)
    return 'Must be between 0 and 100';
  return null;
};

const GLOBAL_URL = '/clustox/benchmarks/global';
const teamUrl = (teamId: string) => `/internal/team/${teamId}/settings`;

/**
 * A validation message coming back from `validate_benchmark_payload`
 * (`mhq/service/settings/benchmarks.py`) always contains the offending
 * metric's key verbatim, e.g. "change_failure_rate must be between 0 and
 * 100". Flask's default error page wraps that text in HTML, so tags are
 * stripped before searching -- this way the field is found whether the BFF
 * forwarded a clean JSON message or the raw werkzeug error page.
 */
const fieldFromServerError = (
  raw: unknown
): { metric: BenchmarkMetric | null; message: string } => {
  const text = String(raw ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const metric = METRICS.find((m) => text.includes(m)) ?? null;
  return { metric, message: text || 'Could not save benchmarks.' };
};

export const BenchmarkSettingsForm: FC<{
  scope: 'team' | 'global';
  /** Called after a successful save. Team-scope callers use this to close
   * the modal that hosts the form; the global section on the Workspaces
   * page renders inline and has none to close. */
  onClose?: () => void;
}> = ({ scope, onClose }) => {
  const { enqueueSnackbar } = useSnackbar();
  const { singleTeamId } = useSingleTeamConfig();
  const teamId = scope === 'team' ? singleTeamId : null;
  const dispatch = useDispatch();
  const doraMetricsFetchArgs = useDoraMetricsFetchArgs();
  const branches = useStateBranchConfig();
  const activeBranchMode = useSelector((s) => s.app.branchMode);

  const [values, setValues] = useState<FormValues | null>(null);
  const [initialValues, setInitialValues] = useState<FormValues | null>(null);
  const [inherited, setInherited] = useState<BenchmarkSettingValues | null>(
    null
  );
  const [loading, setLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [serverErrors, setServerErrors] = useState<
    Partial<Record<BenchmarkMetric, string>>
  >({});
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (scope === 'team' && !teamId) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setLoadFailed(false);

    const request =
      scope === 'global'
        ? handleApi<{ setting: BenchmarkSettingValues }>(GLOBAL_URL)
        : handleApi<FetchTeamSettingsAPIResponse<BenchmarkSettingValues>>(
            teamUrl(teamId),
            { params: { setting_type: 'BENCHMARK_SETTING' } }
          );

    request
      .then((data) => {
        if (cancelled) return;
        const next = METRICS.reduce((acc, metric) => {
          acc[metric] = toDisplayValue(metric, data.setting?.[metric] ?? null);
          return acc;
        }, {} as FormValues);
        setValues(next);
        setInitialValues(next);
      })
      .catch(() => {
        if (!cancelled) setLoadFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [scope, teamId]);

  // CLUSTOX: the placeholder wants to show what clearing a field reverts to.
  // For a team, that's the global baseline. `GET /clustox/benchmarks/global`
  // is readable by any authenticated admin (see the CLUSTOX comment on that
  // route) specifically so this call succeeds for the workspace admin/EM who
  // ordinarily opens this form, not just for the platform superadmin. Still
  // wrapped as best-effort -- on any failure (a logged-out session, a
  // network error) the placeholder falls back to a generic hint instead of a
  // figure, rather than the form breaking over something that isn't the
  // user's fault.
  useEffect(() => {
    if (scope !== 'team') return;
    let cancelled = false;
    handleApi<{ setting: BenchmarkSettingValues }>(GLOBAL_URL)
      .then((data) => {
        if (!cancelled) setInherited(data.setting);
      })
      .catch(() => {
        if (!cancelled) setInherited(null);
      });
    return () => {
      cancelled = true;
    };
  }, [scope]);

  const clientErrors = useMemo(() => {
    if (!values) return {};
    return METRICS.reduce(
      (acc, metric) => {
        const err = clientErrorFor(metric, values[metric]);
        if (err) acc[metric] = err;
        return acc;
      },
      {} as Partial<Record<BenchmarkMetric, string>>
    );
  }, [values]);

  const isDirty = useMemo(() => {
    if (!values || !initialValues) return false;
    return METRICS.some((metric) => values[metric] !== initialValues[metric]);
  }, [values, initialValues]);

  const handleChange = useCallback((metric: BenchmarkMetric, raw: string) => {
    setValues((v) => ({ ...(v ?? EMPTY_FORM_VALUES), [metric]: raw }));
    setServerErrors((errs) => {
      if (!errs[metric]) return errs;
      const next = { ...errs };
      delete next[metric];
      return next;
    });
  }, []);

  const handleDiscard = useCallback(() => {
    if (!initialValues) return;
    setValues(initialValues);
    setServerErrors({});
    setFormError(null);
  }, [initialValues]);

  const handleSave = useCallback(async () => {
    if (!values || (scope === 'team' && !teamId)) return;

    const payload = METRICS.reduce((acc, metric) => {
      const apiValue = toApiValue(metric, values[metric]);
      if (apiValue !== undefined) acc[metric] = apiValue;
      return acc;
    }, {} as Partial<BenchmarkSettingValues>);

    setSaving(true);
    setServerErrors({});
    setFormError(null);

    try {
      if (scope === 'global') {
        await handleApi(GLOBAL_URL, { method: 'PUT', data: payload });
      } else {
        await handleApi(teamUrl(teamId), {
          method: 'PUT',
          data: { setting_type: 'BENCHMARK_SETTING', setting_data: payload }
        });
      }

      setInitialValues(values);

      // CLUSTOX: the targets ride on the dora_metrics response, so without
      // this the cards keep drawing the OLD target line until a full page
      // reload -- the admin saves, the modal closes, and nothing on screen
      // changes. Both sibling modals in the same menu
      // (TeamProductionBranchSelector, TeamIncidentPRsFilter) already refetch
      // on save; this matches them. Team scope only: the global form lives on
      // the Workspaces page, where no DORA state is mounted to refresh.
      if (scope === 'team') {
        await dispatch(
          fetchTeamDoraMetrics({
            ...doraMetricsFetchArgs,
            branches:
              activeBranchMode === ActiveBranchMode.PROD ? null : branches
          })
        );
      }

      enqueueSnackbar('Benchmarks updated', {
        variant: 'success',
        autoHideDuration: 3000
      });
      // CLUSTOX: only close on success. The existing team-settings modals
      // (TeamProductionBranchSelector, TeamIncidentPRsFilter) close
      // unconditionally and rely on a toast to report failure -- that can't
      // work here, since a rejected value has to stay on screen, next to the
      // field it was rejected for, for the admin to fix.
      onClose?.();
    } catch (err: any) {
      // CLUSTOX: server errors are shown against the field named in the
      // message, never as a toast -- see the comment above `handleSave`.
      const raw = err?.data?.message ?? err?.data ?? err?.message;
      const { metric, message } = fieldFromServerError(raw);
      if (metric) setServerErrors({ [metric]: message });
      else setFormError(message);
    } finally {
      setSaving(false);
    }
  }, [
    values,
    scope,
    teamId,
    enqueueSnackbar,
    onClose,
    dispatch,
    doraMetricsFetchArgs,
    activeBranchMode,
    branches
  ]);

  if (scope === 'team' && !teamId) {
    return (
      <Alert severity="info">Select a team to configure its benchmarks.</Alert>
    );
  }

  if (loading) {
    return (
      <FlexBox p={2} justifyCenter>
        <CircularProgress size={24} />
      </FlexBox>
    );
  }

  if (loadFailed || !values) {
    return (
      <Alert severity="error">
        Could not load benchmark settings. Try again shortly.
      </Alert>
    );
  }

  return (
    <FlexBox col gap={2} maxWidth="560px">
      {scope === 'global' && (
        <>
          <Line bold white fontSize="20px">
            Global DORA Benchmarks
          </Line>
          <Line small secondary>
            The default target every team is measured against unless it sets its
            own.
          </Line>
          <Divider />
        </>
      )}

      {formError && <Alert severity="error">{formError}</Alert>}

      <FlexBox col gap={2}>
        {METRICS.map((metric) => {
          const errorText = clientErrors[metric] || serverErrors[metric];
          const placeholder =
            scope === 'team' && inherited?.[metric] != null
              ? formatInheritedPlaceholder(metric, inherited[metric] as number)
              : 'not set';

          return (
            <TextField
              key={metric}
              label={`${METRIC_LABEL[metric]} (${UNIT_LABEL[metric]})`}
              placeholder={placeholder}
              value={values[metric]}
              type="number"
              size="small"
              fullWidth
              autoComplete="off"
              inputProps={{
                min: 0,
                step: 'any',
                ...(metric === 'change_failure_rate' ? { max: 100 } : {})
              }}
              error={Boolean(errorText)}
              helperText={errorText || ' '}
              onChange={(e) => handleChange(metric, e.target.value)}
            />
          );
        })}
      </FlexBox>

      <FlexBox justifyEnd gap2 mt={1}>
        <Button
          variant="outlined"
          disabled={saving || !isDirty}
          sx={{ width: '140px' }}
          onClick={handleDiscard}
        >
          Discard
        </Button>
        <LoadingButton
          variant="outlined"
          color="primary"
          loading={saving}
          disabled={!isDirty || Object.keys(clientErrors).length > 0}
          sx={{ width: '140px' }}
          onClick={handleSave}
        >
          Save
        </LoadingButton>
      </FlexBox>
    </FlexBox>
  );
};
