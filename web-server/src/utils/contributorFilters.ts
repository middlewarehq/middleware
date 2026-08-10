import { omit } from 'ramda';

// CLUSTOX: Change Failure Rate and MTTR have no defensible per-contributor
// definition yet -- the nearest analog would be filtering incidents by
// GitHub issue assignee, which is a weak foundation to build on and unpick
// once Jira-based incident ownership lands. So these two keep every other
// filter (base branches, repo filters, prod-branch workflow config) but
// never see the contributor selection, unlike Lead Time and Deployment
// Frequency.
//
// Lives in its own file, deliberately import-light (just ramda), so the
// "only the contributor keys are stripped, everything else passes through"
// contract can be unit tested without dragging in the dora_metrics route's
// full dependency graph (db, auth, `@/utils/date` -> `@/utils/mock` ->
// `@faker-js/faker`, which is ESM-only and breaks under this repo's Jest
// config).
export const stripContributorFilters = <
  PrFilters extends { pr_filter: Record<string, any> | null },
  WorkflowFilters extends Record<string, any> | null | undefined
>(
  prFilters: PrFilters,
  workflowFilters: WorkflowFilters
) => ({
  prFilter: prFilters.pr_filter
    ? { pr_filter: omit(['authors'], prFilters.pr_filter) }
    : prFilters,
  workflowFilter: workflowFilters
    ? omit(['event_actors'], workflowFilters)
    : workflowFilters
});
