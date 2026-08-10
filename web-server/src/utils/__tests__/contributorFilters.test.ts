import { stripContributorFilters } from '@/utils/contributorFilters';

// CLUSTOX: pins the fix for a bug where Change Failure Rate and MTTR were
// silently filtered by contributor even though their cards say "team-wide".
// `stripContributorFilters` is what keeps CFR/MTTR's request payload free of
// the contributor keys while leaving every other filter (base branches, repo
// filters, prod-branch workflow config) untouched -- exactly what the two
// unaffected fetches (Lead Time, Deployment Frequency) still receive
// unfiltered-of-nothing, i.e. with the contributor keys intact.
describe('stripContributorFilters', () => {
  it('drops only `authors` from the pr filter, keeping everything else', () => {
    const prFilters = {
      pr_filter: {
        authors: ['alice', 'bob'],
        base_branches: ['main'],
        repo_filters: { 'repo-1': { base_branches: ['main'] } }
      }
    };

    const { prFilter } = stripContributorFilters(prFilters, null);

    expect(prFilter).toEqual({
      pr_filter: {
        base_branches: ['main'],
        repo_filters: { 'repo-1': { base_branches: ['main'] } }
      }
    });
    expect(prFilter.pr_filter).not.toHaveProperty('authors');
  });

  it('drops only `event_actors` from the workflow filter, keeping everything else', () => {
    const workflowFilters = {
      event_actors: ['alice'],
      'repo-1': { base_branches: ['main'] }
    };

    const { workflowFilter } = stripContributorFilters(
      { pr_filter: null },
      workflowFilters
    );

    expect(workflowFilter).toEqual({
      'repo-1': { base_branches: ['main'] }
    });
    expect(workflowFilter).not.toHaveProperty('event_actors');
  });

  it('leaves a null pr_filter as-is when no other filters are set', () => {
    const prFilters: { pr_filter: Record<string, any> | null } = {
      pr_filter: null
    };

    const { prFilter } = stripContributorFilters(prFilters, undefined);

    expect(prFilter).toBe(prFilters);
  });

  it('leaves an unset workflow filter as-is', () => {
    const { workflowFilter } = stripContributorFilters(
      { pr_filter: null },
      undefined
    );

    expect(workflowFilter).toBeUndefined();
  });

  it('is a no-op when no contributor was selected', () => {
    const prFilters = {
      pr_filter: { base_branches: ['main'] }
    };
    const workflowFilters = { 'repo-1': { base_branches: ['main'] } };

    const { prFilter, workflowFilter } = stripContributorFilters(
      prFilters,
      workflowFilters
    );

    expect(prFilter).toEqual(prFilters);
    expect(workflowFilter).toEqual(workflowFilters);
  });
});
