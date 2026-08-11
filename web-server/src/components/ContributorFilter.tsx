import {
  Autocomplete,
  CircularProgress,
  ListItem,
  TextField
} from '@mui/material';
import { useRouter } from 'next/router';
import pluralize from 'pluralize';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { handleApi } from '@/api-helpers/axios-api-instance';
import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';

type Contributor = {
  username: string;
  pr_count: number;
};

const QUERY_KEY = 'contributors';

const parseSelectedFromQuery = (raw: string | string[]): string[] => {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value ? value.split(',').filter(Boolean) : [];
};

/**
 * CLUSTOX: single source of truth for the contributor selection. It lives in
 * the URL -- unlike the team/date selectors, which are redux-only -- so a
 * filtered dashboard survives a refresh and can be shared as a link. Cards
 * that need to know "is a contributor selected, and who" read this hook
 * directly instead of taking it as a prop, matching how they already source
 * team/date themselves (see useCurrentDateRangeLabel and friends).
 */
export const useSelectedContributors = (): string[] => {
  const { query } = useRouter();
  // CLUSTOX: keyed off the raw query value (a string), not the whole `query`
  // object -- that object gets a new identity on every navigation, including
  // unrelated ones like OverlayPageContext pushing its own `overlays` param
  // when a "See details" panel opens. Depending on the whole object would
  // refetch the DORA summary on every such click.
  const raw = query[QUERY_KEY] as string | string[];
  return useMemo(() => parseSelectedFromQuery(raw), [raw]);
};

export const ContributorFilter = () => {
  const router = useRouter();
  const { singleTeamId, dates } = useSingleTeamConfig();
  const selected = useSelectedContributors();

  const [contributors, setContributors] = useState<Contributor[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // CLUSTOX: true once a fetch for the *current* team/date has resolved
  // successfully. Gates the stale-selection cleanup below so it can't run
  // against a still-loading or still-failed list.
  const [settled, setSettled] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const setSelected = useCallback(
    (usernames: string[]) => {
      const nextQuery: Record<string, string | string[]> = {
        ...router.query
      };
      if (usernames.length) nextQuery[QUERY_KEY] = usernames.join(',');
      else delete nextQuery[QUERY_KEY];
      router.replace({ query: nextQuery }, undefined, { shallow: true });
    },
    [router]
  );

  useEffect(() => {
    if (!singleTeamId) {
      setContributors([]);
      setSettled(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setSettled(false);

    handleApi<Contributor[]>(`internal/team/${singleTeamId}/contributors`, {
      params: { from_date: dates.start, to_date: dates.end }
    })
      .then((data) => {
        if (cancelled) return;
        setContributors(data || []);
        setSettled(true);
      })
      .catch(() => {
        if (cancelled) return;
        setContributors([]);
        setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [singleTeamId, dates.start, dates.end]);

  // Drop selections the fresh list no longer backs, visibly -- a silent drop
  // would move the DORA numbers on screen with no explanation for why.
  useEffect(() => {
    if (!settled || !selected.length) return;

    const valid = new Set(contributors.map((c) => c.username));
    const stale = selected.filter((u) => !valid.has(u));
    if (!stale.length) return;

    setSelected(selected.filter((u) => valid.has(u)));
    setNotice(
      `${stale.join(', ')} ${
        stale.length > 1 ? "aren't" : "isn't"
      } active in this range anymore, so ${
        stale.length > 1 ? "they've" : "it's"
      } been removed from the filter.`
    );
  }, [settled, contributors, selected, setSelected]);

  useEffect(() => {
    if (!notice) return;
    const timeout = setTimeout(() => setNotice(null), 6000);
    return () => clearTimeout(timeout);
  }, [notice]);

  const isEmpty = settled && contributors.length === 0;
  // Whatever else is going on, a selection must stay removable. Disabling the
  // control on a failed fetch left chips that could not be deleted while the
  // dashboard carried on sending `authors`, and the cards carried on saying
  // "authored by alice" -- the only way out was hand-editing the URL. With
  // nothing selected this is exactly the old behaviour.
  const disabled =
    !singleTeamId || (!selected.length && (loading || failed || isEmpty));

  // Rendered from the selection, not from an intersection with the fetched
  // list, so chips survive a fetch that failed or has not landed yet. Stale
  // selections are still dropped -- but only by the effect above, which runs
  // on a *successful* fetch and says so in a notice.
  const value = useMemo(() => {
    const fetched = new Map(contributors.map((c) => [c.username, c]));
    return selected.map(
      (username) => fetched.get(username) || { username, pr_count: 0 }
    );
  }, [contributors, selected]);

  const helperText = notice
    ? notice
    : loading
    ? 'Loading contributors…'
    : failed
    ? 'Could not load contributors.'
    : isEmpty
    ? 'No contributors in this range'
    : undefined;

  return (
    <Autocomplete<Contributor, true, false, false>
      multiple
      size="small"
      disabled={disabled}
      options={contributors}
      value={value}
      loading={loading}
      sx={{ minWidth: 280 }}
      getOptionLabel={(option) => option.username}
      isOptionEqualToValue={(option, val) => option.username === val.username}
      onChange={(_, newValue) => setSelected(newValue.map((c) => c.username))}
      renderOption={(props, option) => (
        <ListItem {...props} key={option.username}>
          <FlexBox col>
            <Line>{option.username}</Line>
            <Line tiny secondary>
              {option.pr_count} {pluralize('PR', option.pr_count)}
            </Line>
          </FlexBox>
        </ListItem>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder="Contributor"
          error={failed}
          helperText={helperText}
          FormHelperTextProps={
            notice ? { sx: { color: 'warning.main' } } : undefined
          }
          InputProps={{
            ...params.InputProps,
            endAdornment: (
              <FlexBox gap1 alignCenter>
                {loading ? (
                  <CircularProgress color="inherit" size={16} />
                ) : null}
                {params.InputProps.endAdornment}
              </FlexBox>
            )
          }}
        />
      )}
    />
  );
};
