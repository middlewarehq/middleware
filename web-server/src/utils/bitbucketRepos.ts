import { Integration } from '@/constants/integrations';

// CLUSTOX: lives here rather than in git_org_repos.ts so its test can import
// it without dragging Endpoint -> next-auth's ESM build into jest -- the same
// wall benchmarks.ts and contributorFilters.ts were written import-light to
// dodge. The route imports from here; one direction, no cycle.
export type AdaptedBitbucketRepo = {
  id: string;
  name: string;
  desc: string | null;
  slug: string;
  web_url: string | undefined;
  branch: string | null;
  parent: string;
  provider: Integration;
};

// The shape must match what the GitHub and GitLab branches return
// key-for-key: the repo-selection UI reads all three providers through one
// code path, so a missing or renamed key surfaces as a blank column in the
// picker, not an error.
export const adaptBitbucketRepo = (
  repo: Record<string, any>,
  org: string
): AdaptedBitbucketRepo => ({
  id: repo.uuid,
  name: repo.name,
  desc: repo.description ?? null,
  slug: repo.slug,
  web_url: repo.links?.html?.href,
  branch: repo.mainbranch?.name || null,
  parent: org,
  provider: Integration.BITBUCKET
});
