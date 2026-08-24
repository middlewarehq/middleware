import { CODE_PROVIDERS } from '@/constants/codeProviders';

// CLUSTOX: regression guard for a real bug found while building Jira
// linking. pages/integrations.tsx's hasCodeProviderLinked used to be
// `integrationList.length > 0` -- true for *any* linked integration, not
// specifically a code provider. Once Jira became linkable, linking Jira
// alone would have incorrectly flagged "code provider linked," wrongly
// surfacing the DORA CTA, the force-sync button, and the "create a team"
// prompt for a workspace with no actual code repos. Filtering
// integrationList through this exact list is the fix; this test guards it
// directly so a future non-code integration (Slack, PagerDuty, ...) doesn't
// get added here by mistake the same way.
describe('CODE_PROVIDERS', () => {
  it('is exactly the code-hosting providers', () => {
    expect(CODE_PROVIDERS).toEqual(['github', 'gitlab', 'bitbucket']);
  });

  it('does not include jira', () => {
    expect(CODE_PROVIDERS).not.toContain('jira');
  });
});
