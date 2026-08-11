import {
  contributorSelectionKey,
  parseSelectedFromQuery
} from '@/utils/contributorQuery';

// CLUSTOX: the contributor selection lives in the URL, so this parser decides
// what a shared or hand-edited link actually filters on. Next types a query
// value as `string | string[]`: `?contributors=a,b` arrives as a string, but a
// repeated `?contributors=a&contributors=b` arrives as an array. The original
// took `raw[0]` and silently dropped everything after the first, so a
// two-person link quietly filtered on one person.
describe('parseSelectedFromQuery', () => {
  it('parses the comma-separated form the component itself writes', () => {
    expect(parseSelectedFromQuery('alice,bob')).toEqual(['alice', 'bob']);
  });

  it('keeps every value when the param repeats, not just the first', () => {
    // `?contributors=alice&contributors=bob`
    expect(parseSelectedFromQuery(['alice', 'bob'])).toEqual(['alice', 'bob']);
  });

  it('handles a repeated param whose entries are themselves comma-separated', () => {
    expect(parseSelectedFromQuery(['alice,bob', 'carol'])).toEqual([
      'alice',
      'bob',
      'carol'
    ]);
  });

  it('de-duplicates, so a name repeated across forms is only sent once', () => {
    expect(parseSelectedFromQuery(['alice', 'alice,bob'])).toEqual([
      'alice',
      'bob'
    ]);
  });

  it('drops empty segments from a malformed value', () => {
    expect(parseSelectedFromQuery(',alice,,bob,')).toEqual(['alice', 'bob']);
  });

  it('returns an empty selection when the param is absent or blank', () => {
    expect(parseSelectedFromQuery(undefined as unknown as string)).toEqual([]);
    expect(parseSelectedFromQuery('')).toEqual([]);
    expect(parseSelectedFromQuery([])).toEqual([]);
  });
});

// The memo key has to be a primitive, and it has to compare equal for two URL
// spellings that mean the same selection -- otherwise the DORA summary refetches
// on every render.
describe('contributorSelectionKey', () => {
  it('collapses the array form to the same string as the comma form', () => {
    expect(contributorSelectionKey(['alice', 'bob'])).toBe(
      contributorSelectionKey('alice,bob')
    );
  });

  it('is a stable primitive for an absent param', () => {
    expect(contributorSelectionKey(undefined as unknown as string)).toBe('');
  });
});
