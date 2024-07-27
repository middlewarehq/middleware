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
  ),
  change_failure_rate: lazy(() =>
    import('@/components/OverlayComponents/ChangeFailureRate').then((c) => ({
      default: c.ChangeFailureRate
    }))
  ),
  all_incidents: lazy(() =>
    import('@/content/DoraMetrics/Incidents').then((c) => ({
      default: c.AllIncidentsBody
    }))
  ),
  resolved_incidents: lazy(() =>
    import('@/content/DoraMetrics/ResolvedIncidents').then((c) => ({
      default: c.ResolvedIncidentsBody
    }))
  ),
  ai_analysis: lazy(() =>
    import('@/content/DoraMetrics/AIAnalysis/AIAnalysis').then((c) => ({
      default: c.AIAnalysis
    }))
  )
};
