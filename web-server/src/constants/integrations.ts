export enum Integration {
  GOOGLE = 'google',
  JIRA = 'jira',
  SLACK = 'slack',
  GITHUB = 'github',
  BITBUCKET = 'bitbucket',
  GITLAB = 'gitlab',
  ZENDUTY = 'zenduty',
  PAGERDUTY = 'pagerduty',
  OPSGENIE = 'opsgenie',
  MICROSOFT = 'azure-ad',
  CIRCLECI = 'circle_ci',
  // CLUSTOX: Jenkins is a deployment provider, not a code provider -- it is
  // deliberately absent from CODE_PROVIDER_INTEGRATIONS_MAP.
  JENKINS = 'jenkins'
}

export enum CIProvider {
  GITHUB_ACTIONS = 'GITHUB_ACTIONS',
  CIRCLE_CI = 'CIRCLE_CI'
}

export enum WorkflowType {
  DEPLOYMENT = 'DEPLOYMENT'
}
