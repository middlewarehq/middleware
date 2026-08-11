import { uniq } from 'ramda';

// CLUSTOX: URL <-> selection plumbing for the DORA contributor filter.
//
// The selection lives in the query string rather than redux, so a filtered
// dashboard survives a refresh and can be pasted to someone else. That makes
// this the only thing standing between a shared or hand-edited link and the
// filter the dashboard actually applies, which is worth testing directly.
//
// Lives here rather than in ContributorFilter.tsx, and deliberately imports
// nothing but ramda, because this repo's Jest config maps `.tsx` through
// ts-jest with Next's `jsx: preserve` -- so importing the component into a
// test fails on the first JSX token. Same reasoning as contributorFilters.ts.

export const CONTRIBUTOR_QUERY_KEY = 'contributors';

/**
 * Next types a query value as `string | string[]`: `?contributors=a,b` arrives
 * as a string, but a *repeated* `?contributors=a&contributors=b` arrives as an
 * array. Both forms mean the same thing to a user, so both are accepted.
 */
export const parseSelectedFromQuery = (raw: string | string[]): string[] => {
  const values = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return uniq(values.flatMap((value) => value.split(',')).filter(Boolean));
};

/**
 * A stable primitive identity for a raw query value, for use as a memo
 * dependency. The array form is a fresh object on every render, so depending on
 * it directly would invalidate the memo forever and refetch the DORA summary in
 * a loop. Collapsing to the same comma-separated string the component writes
 * makes the two URL spellings compare equal, as they should.
 */
export const contributorSelectionKey = (raw: string | string[]): string =>
  Array.isArray(raw) ? raw.join(',') : raw || '';
