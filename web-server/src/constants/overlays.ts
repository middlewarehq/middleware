import { lazy } from 'react';

export const overlaysImportMap = {
  dummy: lazy(() =>
    import('@/components/OverlayComponents/Dummy').then((c) => ({
      default: c.Dummy
    }))
  ),
  team_prs: lazy(() =>
    import('@/content/PullRequests/TeamInsightsBody').then((c) => ({
      default: c.TeamInsightsBodyRouterless
    }))
  ),
  team_edit: lazy(() =>
    import('@/components/OverlayComponents/TeamEdit').then((c) => ({
      default: c.TeamEdit
    }))
  ),
  deployment_freq: lazy(() =>
    import('@/content/PullRequests/DeploymentInsightsOverlay').then((c) => ({
      default: c.DeploymentInsightsOverlay
    }))
  )
};
