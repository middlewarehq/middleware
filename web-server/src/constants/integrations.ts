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
  WEBHOOK = 'webhook'
}

export enum CIProvider {
  GITHUB_ACTIONS = 'GITHUB_ACTIONS',
  CIRCLE_CI = 'CIRCLE_CI',
  WEBHOOK = 'WEBHOOK'
}

export enum WorkflowType {
  DEPLOYMENT = 'DEPLOYMENT'
}
