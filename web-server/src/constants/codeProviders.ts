// CLUSTOX: extracted so this stays importable on its own, without pulling
// in pages/integrations.tsx's full dependency tree (PageWrapper ->
// ErrorBoundaryFallback -> ... -> a .png import) just for one array --
// that tree has nothing to do with what this constant is actually for.
//
// integrationList (from useAuth()) is every linked integration, including
// non-code ones like jira. Team creation, the DORA CTA, and force-sync are
// specifically about code providers -- filtering integrationList through
// this list, once, is what keeps that distinction from leaking into every
// computation that follows. See docs/JIRA_INTEGRATION_PROPOSAL.md.
export const CODE_PROVIDERS = ['github', 'gitlab', 'bitbucket'] as const;
