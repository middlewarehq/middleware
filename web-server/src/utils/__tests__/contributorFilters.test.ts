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

  // The shape below is the one the backend actually parses: `event_actors`
  // lives *inside* the `workflow_filter` blob, alongside `head_branches`,
  // because ParseWorkflowFilterProcessor.apply
  // (mhq/service/workflows/workflow_filter.py) reads
  // `workflow_filter.get("event_actors")` off the parsed blob. Stripping the
  // top level would leave the key in place and CFR would stay filtered.
  it('drops only `event_actors` from inside workflow_filter, keeping everything else', () => {
    const workflowFilters = {
      workflow_filter: {
        head_branches: ['^main$'],
        event_actors: ['alice']
      }
    };

    const { workflowFilter } = stripContributorFilters(
      { pr_filter: null },
      workflowFilters
    );

    expect(workflowFilter).toEqual({
      workflow_filter: { head_branches: ['^main$'] }
    });
    expect(workflowFilter.workflow_filter).not.toHaveProperty('event_actors');
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
    const workflowFilters = {
      workflow_filter: { head_branches: ['^main$'] }
    };

    const { prFilter, workflowFilter } = stripContributorFilters(
      prFilters,
      workflowFilters
    );

    expect(prFilter).toEqual(prFilters);
    expect(workflowFilter).toEqual(workflowFilters);
  });
});
