import { SvgIconTypeMap } from '@mui/material';
import { OverridableComponent } from '@mui/material/OverridableComponent';
import { ReactChild, ReactFragment, ReactPortal } from 'react';

import { Row } from '@/constants/db';
import { CIProvider, Integration } from '@/constants/integrations';
import { Team } from '@/types/api/teams';

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type UserWithAvatar = MiniUser & { avatar_url?: string };
export type BaseUser = UserWithAvatar;
export type BaseUserExtended = BaseUser & { org_id: ID };

export type MiniTeam = {
  id: string;
  name: string;
  member_count: number;
  manager_id: string;
  member_ids: ID[];
};

export enum IntegrationGroup {
  PROJECT = 'PROJECT',
  CODE = 'CODE',
  INCIDENT = 'INCIDENT',
  DEPLOYMENT = 'DEPLOYMENT',
  MEETING = 'MEETING',
  COMMS = 'COMMS'
}

export interface MiniUser {
  id: string;
  name: string;
  email: string;
}

export type TeamDeploymentFrequency = {
  total_deployments: number;
  weekly_avg_deployments: number;
  weekly_deployments_over_time: number[];
};

export type TeamDeploymentCountApiResponse = {
  total_deployments: number;
};

export type TeamDeploymentFrequencyApiResponse = {
  avg_deployments: number;
  deployments_over_time: number[];
};

export type PrevDeploymentFrequency = {
  prev_weekly_avg_deployments: number;
  prev_weekly_deployments_over_time: number[];
};

export type TeamDeploymentsConfigured = {
  deployments_configured: boolean;
  deployments_configured_for_all_repos: boolean;
};

export interface LeadTimePipelineDuration {
  avg: LeadTimePipelineStat;
  prev_avg: LeadTimePipelineStat;
  p90: LeadTimePipelineStat;
}

export interface PipelineStat {
  first_response_time: number;
  rework_time: number;
  merge_time: number;
}
export interface LeadTimePipelineStat {
  first_commit_to_pr_time: number;
  first_response_time: number;
  rework_time: number;
  merge_time: number;
  pr_to_deploy_time: number;
}

export interface PullRequestResponse {
  data: PR[];
  page: number;
  page_size: number;
  total_count: number;
}

export type PrUser = {
  username: string;
  linked_user?: Omit<MiniUser, 'email'>;
};

export interface BasePR {
  id: ID;
  number: string;
  title: string;
  state: 'MERGED' | 'CLOSED' | 'OPEN';
  first_commit_to_open?: number;
  first_response_time?: number;
  rework_time?: number;
  merge_time?: number;
  cycle_time?: number;
  merge_to_deploy?: number;
  author: PrUser;
  reviewers: PrUser[];
  repo_name: string;
  pr_link: string;
  base_branch: string;
  created_at: DateString;
  head_branch: string;
  updated_at: DateString;
  state_changed_at: DateString;
  commits: number;
  additions: number;
  deletions: number;
  changed_files: number;
  comments: number;
  provider: 'github' | 'bitbucket' | 'gitlab';
  rework_cycles?: number;
}

export interface PR extends BasePR {
  lead_time_as_sum_of_parts?: number;
  lead_time?: number;
  original_reverted_pr?: BasePR;
}

export enum UserRole {
  EM = 'EM',
  ENGINEER = 'ENGINEER',
  MOM = 'MOM' // Manager of Manager
}

export interface StateChange {
  state: string;
  from_time: DateString;
  to_time: DateString | null;
  time_spent: string;
}

export interface PrCycleTimeBucket {
  minTime: number;
  maxTime: number;
  label: string;
  prCount: number;
  presentableLabel: string;
}

export interface AuthenticatedUser {
  user: Row<'Users'>;
  org: DBOrgRow;
  integration_names: string[];
  identity_names: string[];
}

export interface DBOrgRow {
  id: string;
  created_at: Date;
  name: string;
  domain: string;
  other_domains: null;
}

export interface DBUserRow {
  id: string;
  created_at: Date;
  org_id: string;
  name: string;
  updated_at: Date;
  primary_email: string;
  is_deleted: boolean;
  onboarding_state: OnboardingState;
  avatar_url: null;
}

export type Comparison<T> = {
  curr: T;
  prev: T;
};

export type TicketSettings = Record<
  'COMPLETED' | 'IN_PROGRESS' | 'ALL',
  string[]
>;

export type TicketTypes = Record<'ALL' | 'EXCLUDED' | 'BUGS', string[]>;

export type UserTicketTypesApiResponse = {
  types: TicketTypes;
  user: BaseUser;
};

export type RepoWorkflowResponse = {
  workflows: RepoWorkflow[];
  next_page_token: string;
};

export type RepoWorkflow = {
  id: number;
  name: string;
  html_url: string | null;
  ci_provider: CIProvider;
  provider_workflow_id: string;
  value: string;
};

export type AdaptedRepoWorkflow = Pick<RepoWorkflow, 'name' | 'value'>;

export type SelectedRepo = Row<'OrgRepo'> & {
  repo_workflow: Row<'RepoWorkflow'>;
};

export type Deployment = {
  id: ID;
  status: 'SUCCESS' | 'FAILURE';
  head_branch: string;
  event_actor: PrUser;
  created_at: DateString;
  updated_at: DateString;
  conducted_at: DateString;
  pr_count: number;
  run_duration: number;
  html_url: string;
  repo_workflow_id: ID;
};

export type AppPlan = {
  type: 'GROWTH' | 'STARTER';
  expiry: Date;
  hasExpired: boolean;
};

export type TeamDeploymentsApiResponse = {
  deployments_map: Record<ID, Deployment[]>;
  repos_map: Record<ID, BaseRepo>;
  workflows_map: Record<ID, RepoWorkflowExtended>;
};

export type BaseRepo = {
  id: string | number;
  name: string;
  desc: string;
  slug: string;
  parent: string;
  web_url: string;
  language: string;
  branch: string;
  deployment_type: DeploymentSources;
  repo_workflows: AdaptedRepoWorkflow[];
};

export enum NotificationType {
  PENDING_ONEONONE_ACTION_ITEMS = 'PENDING_ONEONONE_ACTION_ITEMS',
  WEEKLY_ONEONONE_SUMMARY = 'WEEKLY_ONEONONE_SUMMARY',
  MISSED_ONEONONE = 'MISSED_ONEONONE',
  EMAIL_DIGEST = 'EMAIL_DIGEST'
}

export enum NotificationStateType {
  ON = 'ON',
  OFF = 'OFF',
  UNSET = 'UNSET',
  WEEKLY = 'WEEKLY',
  TWO_WEEKS = 'TWO_WEEKS',
  MONTHLY = 'MONTHLY'
}

export type EmailDigestSettings = {
  is_active: boolean;
  metrics: (keyof typeof EmailMetrics)[];
  cadence: keyof typeof DigestCadence;
};

export type EmailDigestPayload = {
  user_id: string;
  setting_data: {
    is_active: boolean;
    metrics: (keyof typeof EmailMetrics)[];
    cadence: keyof typeof NotificationStateType;
  };
};

export enum EmailMetrics {
  COMPARISON_CYCLE_TIME = 'COMPARISON_CYCLE_TIME',
  COMPARISON_FIRST_RESPONSE_TIME = 'COMPARISON_FIRST_RESPONSE_TIME',
  COMPARISON_REWORK_TIME = 'COMPARISON_REWORK_TIME',
  COMPARISON_MERGE_TIME = 'COMPARISON_MERGE_TIME',
  CYCLE_TIME_COMPARISON = 'CYCLE_TIME_COMPARISON',
  REVERT_PR_COUNT_COMPARISON = 'REVERT_PR_COUNT_COMPARISON'
}

export enum DigestCadence {
  WEEKLY = 'WEEKLY',
  TWO_WEEKS = 'TWO_WEEKS',
  MONTHLY = 'MONTHLY'
}

export type NotificationSetting = {
  notification_type: NotificationType;
  state: NotificationStateType;
};

export type NotificationSettingsApiResponse = {
  user_notifications_settings: NotificationSetting[];
  org_notifications_settings: NotificationSetting[];
};

export type InternalNotificationSettingsResponseType = {
  user_id?: string;
  org_id?: string;
  created_at: DateString;
  updated_at: DateString;
  state: NotificationStateType;
  notification_type: NotificationType;
};

export type InternalApiJiraActivityType = {
  count_tickets_assigned: number;
  task_type_distribution: Partial<
    Record<'Bug' | 'Story' | 'Sub-task' | 'Task', number>
  >;
  count_tickets_assigned_and_idle: number;
};

export type JiraUserResponseType = {
  username: string;
  linked_user?: BaseUser;
};

export type JiraUserActivityResponseType = {
  user: JiraUserResponseType;
  jira_activity: InternalApiJiraActivityType;
};

export enum IncidentStatus {
  TRIGGERED = 'triggered',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved'
}

export type IncidentProviderType = 'zenduty';

export type Incident = {
  id: ID;
  title: string;
  summary: string;
  key: string;
  incident_number: number;
  provider: IncidentProviderType;
  status: IncidentStatus;
  creation_date: DateString;
  resolved_date: DateString;
  acknowledged_date: DateString;
  assigned_to: JiraUserResponseType;
  assignees: JiraUserResponseType[];
  url: string;
};

export type IncidentsWithDeploymentResponseType = Incident & {
  possible_deployment?: Deployment;
  week_id?: ID;
};

export type DeploymentWithIncidents = Deployment & { incidents: Incident[] };

export type IncidentWeekType = {
  id: ID;
  week_start_time: Date;
  week_index: number;
};

export type IncidentWeekMapType = Record<ID, IncidentWeekType>;

export interface IncidentService {
  id: ID;
  name: string;
  provider: Integration;
  org_id: ID;
  key: string;
  auto_resolve_timeout: number;
  acknowledgement_timeout: number;
  status: 'active';
}

export interface TeamIncidentService {
  id: ID;
  service_id: ID;
  service_name: string;
  provider: Integration;
  team_id: ID;
  org_id: ID;
}

export type OrgIncidentServicesApiResponse = {
  incident_services: IncidentService[];
};

export type TeamIncidentServicesApiResponse = {
  team_incident_services: TeamIncidentService[];
};

export type IncidentServicesResponse = {
  services: IncidentProviderServices[];
  selected: IncidentService[];
};

export type TeamSelectedIncidentServicesBFFApiResponse = {
  org_incident_services: IncidentService[];
  team_incident_services: TeamIncidentService[];
  incident_provider_all_teams: IncidentProviderOrgTeam[];
  incident_provider_assigned_teams: IncidentProviderAssignedTeam[];
};

export type IncidentProviderServices = {
  name: string;
  key: string;
  auto_resolve_timeout: number;
  acknowledgement_timeout: number;
  status: 'active';
  created_by: string;
  provider_team_ids: ID[];
  meta?: object;
};

export type RepoWorkflowExtended = {
  id: ID;
  name: string;
  repo_id: ID;
  created_at: DateString;
  updated_at: DateString;
  type: 'DEPLOYMENT';
  provider: Integration;
};

export type RepoWithSingleWorkflow = {
  org_id: string;
  name: string;
  provider: string;
  created_at: Date;
  updated_at: Date;
  id: string;
  org_name: string;
  is_active: boolean;
  default_branch: string;
  language: string;
  contributors: RepoContributors;
  idempotency_key: string;
  slug: string;
  deployment_type: DeploymentSources;
  repo_workflow: Row<'RepoWorkflow'>;
  team_id: ID;
};

export type RepoWithMultipleWorkflows = Omit<
  RepoWithSingleWorkflow,
  'repo_workflow'
> & { repo_workflows: RepoWorkflow[] };

export type RepoUniqueDetails = Pick<
  RepoWithMultipleWorkflows,
  'name' | 'slug' | 'default_branch' | 'idempotency_key' | 'deployment_type'
> & { repo_workflows: AdaptedRepoWorkflow[] };

export type RepoContributors = {
  contributions: Array<Array<number | string>>;
};

export type TeamRepoBranchDetails = {
  team_id: ID;
  org_repo_id: ID;
  name: string;
  prod_branches: string[] | null;
  is_active: boolean;
};

export type MultipleTeamsDateRangeParams = {
  team_ids: ID[];
  from_date: DateString | Date;
  to_date: DateString | Date;
};

export type TeamLeadTimeForChangeDetails = {
  average_lead_time: number;
  weekly_average_lead_time: number[];
  prev_average_lead_time: number;
  prev_weekly_average_lead_time: number[];
};

export type TeamLeadTimeForChangeApiResponse = {
  data: TeamLeadTimeForChangeDetails;
  repos_included: RepoWithSingleWorkflow[];
  all_team_repos: RepoWithSingleWorkflow[];
};

export type TeamLeadTimeForChangeWithWorkflowRepos =
  TeamLeadTimeForChangeDetails & {
    workflow_configured_repos: RepoWithSingleWorkflow[];
    all_assigned_repos: RepoWithSingleWorkflow[];
  };

export type TeamCycleTimeForChangeDetails = {
  average_cycle_time: number;
  weekly_average_cycle_time: number[];
  prev_average_cycle_time: number;
  prev_weekly_average_cycle_time: number[];
};

export type LeadTimeApiResponse = {
  lead_time: number;
  first_commit_to_open: number;
  first_response_time: number;
  rework_time: number;
  merge_time: number;
  merge_to_deploy: number;
  pr_count: number;
};

export type LeadTimeTrendsApiResponse = Record<DateString, LeadTimeApiResponse>;

export type DeploymentFrequencyApiResponse = {
  total_deployments: number;
  avg_daily_deployment_frequency: number;
  avg_weekly_deployment_frequency: number;
  avg_monthly_deployment_frequency: number;
};

export type DeploymentFrequencyTrends = Record<DateString, { count: number }>;

export type MeanTimeToRestoreApiResponse = {
  mean_time_to_recovery: number;
  incident_count: number;
};

export type MeanTimeToRestoreApiTrendsResponse = Record<
  DateString,
  MeanTimeToRestoreApiResponse
>;

export type ChangeFailureRateApiResponse = {
  change_failure_rate: number;
  failed_deployments: number;
  total_deployments: number;
};

export type ChangeFailureRateTrendsApiResponse = Record<
  DateString,
  ChangeFailureRateApiResponse
>;

export type TeamDoraMetricsApiResponseType = {
  lead_time_stats: {
    current: LeadTimeApiResponse;
    previous: LeadTimeApiResponse;
  };
  lead_time_trends: {
    current: LeadTimeTrendsApiResponse;
    previous: LeadTimeTrendsApiResponse;
  };
  mean_time_to_restore_stats: {
    current: MeanTimeToRestoreApiResponse;
    previous: MeanTimeToRestoreApiResponse;
  };
  mean_time_to_restore_trends: {
    current: MeanTimeToRestoreApiTrendsResponse;
    previous: MeanTimeToRestoreApiTrendsResponse;
  };
  change_failure_rate_stats: {
    current: ChangeFailureRateApiResponse;
    previous: ChangeFailureRateApiResponse;
  };
  change_failure_rate_trends: {
    current: ChangeFailureRateTrendsApiResponse;
    previous: ChangeFailureRateTrendsApiResponse;
  };
  deployment_frequency_stats: {
    current: DeploymentFrequencyApiResponse;
    previous: DeploymentFrequencyApiResponse;
  };
  deployment_frequency_trends: {
    current: DeploymentFrequencyTrends;
    previous: DeploymentFrequencyTrends;
  };
  lead_time_prs: PR[];
  assigned_repos: (Row<'TeamRepos'> & Row<'OrgRepo'>)[];
  unsynced_repos: ID[];
};

export enum ActiveBranchMode {
  'PROD' = 'PROD',
  'CUSTOM' = 'CUSTOM',
  'ALL' = 'ALL'
}

export enum CockpitBranchMode {
  'PROD' = 'PROD',
  'ALL' = 'ALL'
}

export type IncidentSettings = {
  title_includes: string[];
};

export type TeamIncidentSettingApiResponse = {
  created_at: Date;
  updated_at: Date;
  team_id: ID;
  setting: IncidentSettings;
};

export type TeamIncidentSettingsResponse = {
  setting: IncidentSettings;
};

export enum TeamSettings {
  TEAM_MEMBER_METRICS_FILTER_SETTING = 'TEAM_MEMBER_METRICS_FILTER_SETTING',
  EXCLUDED_TICKET_TYPES_SETTING = 'EXCLUDED_TICKET_TYPES_SETTING'
}

export type FetchTeamsResponse = {
  teams: Team[];
  teamReposProdBranchMap: Record<ID, TeamRepoBranchDetails[]>;
  teamReposMap: Record<ID, DB_OrgRepo[]>;
};

export type FetchTeamSettingsAPIResponse<T extends {} = {}> = {
  created_at: DateString;
  updated_at: DateString;
  team_id: ID;
  setting: T;
};

export type TeamDataFilterDBRecord = {
  team_id: ID;
  member_filter_enabled: boolean;
};

export enum ChangeTimeModes {
  LEAD_TIME = 'LEAD_TIME',
  CYCLE_TIME = 'CYCLE_TIME'
}

export type TeamProdBranchesConfig = {
  base_branches: string[];
};

export type RepoFilterConfig = Record<ID, TeamProdBranchesConfig>;

export type StoryPointsBarChartSerie = {
  id: string;
  sp_assigned: number;
  sp_completed: number;
};

export type ExcludedTicketTypesForWarning = {
  show_warning: boolean;
  excluded_ticket_types: string[];
};

export enum AiSummarySource {
  PROJECT_FLOW_ANALYSIS = 'PROJECT_FLOW_ANALYSIS',
  PRS_ANALYSIS = 'PRS_ANALYSIS'
}

export type OrgAlertSettings = {
  should_sync_alerts_as_incidents: boolean;
};

export type OrgDefaultSyncDaysSettings = {
  default_sync_days: number;
};

export type OrgSettingsApiResponse<T extends {} = {}> = {
  created_at: DateString;
  updated_at: DateString;
  org_id: ID;
  setting: T;
};

export type OrgResetBookmarkApiResponse = {
  updated_bookmark: string;
};

export type IncidentProviderAssignedTeam = {
  id: ID;
  team_name: string;
  name: string;
  provider: Integration;
  team_id: ID;
  org_incident_team_id: ID;
  org_id: ID;
};

export type IncidentProviderOrgTeam = {
  id: ID;
  name: string;
  provider: Integration;
  key: string;
  is_deleted: boolean;
  team_id: ID;
  org_incident_team_id: ID;
  org_id: ID;
};

export enum IncidentApiResponseTypes {
  'INCIDENT_PROVIDER_TEAM' = 'INCIDENT_PROVIDER_TEAM',
  'INCIDENT_PROVIDER_SERVICE' = 'INCIDENT_PROVIDER_SERVICE'
}

export type IncidentTeamsAndService = (
  | IncidentService
  | IncidentProviderOrgTeam
  | IncidentProviderAssignedTeam
) & { type: IncidentApiResponseTypes };

export type CodeMetrics = {
  current_average: number;
  previous_average: number;
};

export type CycleTimeBreakdown = {
  first_response_time: CodeMetrics;
  rework_time: CodeMetrics;
  merge_time: CodeMetrics;
};

export type LeadTimeBreakdown = CycleTimeBreakdown & {
  first_commit_to_open: CodeMetrics;
  merge_to_deploy: CodeMetrics;
};

export type ManagerAnalyticsChangeTime<
  T extends CycleTimeBreakdown | LeadTimeBreakdown
> = {
  manager_id: ID;
  team_ids: ID[];
  current_average: number;
  previous_average: number;
  breakdown: T;
};

export type TeamAnalyticsForChangeTime<
  T extends CycleTimeBreakdown | LeadTimeBreakdown
> = {
  team_id: ID;
  current_average: number;
  previous_average: number;
  current_pr_count: number;
  previous_pr_count: number;
  breakdown: T;
};

export type UserAndTeamMapApiReturnType = {
  users_map: Record<string, UserWithAvatar>;
  teams_map: Record<string, MiniTeam>;
};

export type ManagerTeamsMap = {
  manager_id: ID;
  team_ids: ID[];
};

export type ChangeTimeSegment = {
  duration: number;
  previousDuration?: number;
  bgColor: string;
  color: string;
  clipPath: string;
  title: string;
  description: string;
};

export type CockpitProjectFlows = {
  project_flow: TicketCategories;
  team_analytics: CockpitTeamAnalytics[];
  manager_analytics: CockpitManagerAnalytics[];
};

export type TicketCategories = {
  adhoc_tickets: number | null;
  adhoc_tasks_tickets: number | null;
  adhoc_bugs_tickets: number | null;
  carry_over_tickets: number | null;
  completed_tickets: number | null;
  dropped_tickets: number | null;
  pending_tickets: number | null;
  planned_tickets: number | null;
  spillover_tickets: number | null;
  total_tickets: number | null;
  wip_tickets: number | null;
};

export type ProjectFlowNodes = keyof TicketCategories;

export type CockpitTeamAnalytics = {
  team_id: ID;
  project_flow: TicketCategories;
};

export type CockpitManagerAnalytics = {
  manager_id: ID;
  project_flow: TicketCategories;
};

export type DateValueTuple = [DateString, number];

export type LeadTimeTrends = {
  lead_time: DateValueTuple[];
  breakdown: Record<keyof LeadTimeBreakdown, DateValueTuple[]>;
};

export type CycleTimeTrends = {
  cycle_time: DateValueTuple[];
  breakdown: Record<keyof CycleTimeBreakdown, DateValueTuple[]>;
};

export type IntervalTimeMap = {
  from_time: DateString;
  to_time: DateString;
};

export type MeanTimeToRestoreBaseStats = {
  time_to_restore_average: number;
  incident_count: number;
};
export type MeanTimeToRestoreAnalyticsResponse = MeanTimeToRestoreBaseStats & {
  team_analytics: Array<{ team_id: ID } & MeanTimeToRestoreBaseStats>;
  manager_analytics: Array<
    {
      manager_id: ID;
      team_ids: ID[];
    } & MeanTimeToRestoreBaseStats
  >;
};

export type ChangeFailureRateBaseStats = {
  change_failure_rate: number;
  failed_deployments: number;
  total_deployments: number;
};

export type ChangeFailureRateTrendsBaseStats = {
  percentage: number;
  failed_deployments: number;
  total_deployments: number;
};

export type ChangeFailureRateAnalyticsResponse = ChangeFailureRateBaseStats & {
  team_analytics: Array<{ team_id: ID } & ChangeFailureRateBaseStats>;
  manager_analytics: Array<
    {
      manager_id: ID;
      team_ids: ID[];
    } & ChangeFailureRateBaseStats
  >;
};

export type DeploymentFrequencyBaseStats = {
  avg_deployment_frequency: number;
  total_deployments: number;
  duration?: 'day' | 'week' | 'month';
};

export type DeploymentFrequencyAnalyticsResponse = UserAndTeamMapApiReturnType &
  DeploymentFrequencyBaseStats & {
    team_analytics: Array<{ team_id: ID } & DeploymentFrequencyBaseStats>;
    manager_analytics: Array<
      {
        manager_id: ID;
        team_ids: ID[];
      } & DeploymentFrequencyBaseStats
    >;
  };

export type DeploymentFrequencyTrendBase = {
  count: number;
};

export type ValueChangeMap = Record<ID, { current: number; previous: number }>;

export type RevertedAndOriginalPrPair = {
  revert_pr: PR;
  original_reverted_pr: BasePR;
};

export type IncidentApiResponseType = {
  deployments_with_incidents: DeploymentWithIncidents[];
  revert_prs: PR[];
  summary_prs: PR[];
};

export type PageLayout = boolean | ReactChild | ReactFragment | ReactPortal;

export enum PaymentsModalState {
  'PAYMENT_PENDING' = 'PAYMENT_PENDING',
  'PAYMENT_SUCCESS' = 'PAYMENT_SUCCESS',
  'PAYMENT_FAILURE' = 'PAYMENT_FAILURE'
}

export enum DeploymentSources {
  PR_MERGE = 'PR_MERGE',
  WORKFLOW = 'WORKFLOW'
}

export type DeploymentSourceResponse = {
  team_id: ID;
  is_active: boolean;
  name: string;
  id: ID;
  deployment_type: keyof typeof DeploymentSources;
};

export type TeamSelectorModes =
  | 'single'
  | 'multiple'
  | 'date-only'
  | 'single-only'
  | 'multiple-only';

export type DeploymentFrequencyBaseStatsV2 = {
  avg_daily_deployment_frequency: number;
  avg_monthly_deployment_frequency: number;
  avg_weekly_deployment_frequency: number;
  total_deployments: number;
};

export type UpdatedDeploymentFrequencyAnalyticsResponseV2 =
  UserAndTeamMapApiReturnType &
    DeploymentFrequencyBaseStatsV2 & {
      team_analytics: Array<{ team_id: ID } & DeploymentFrequencyBaseStatsV2>;
      manager_analytics: Array<
        {
          manager_id: ID;
          team_ids: ID[];
        } & DeploymentFrequencyBaseStatsV2
      >;
    };

export type UpdatedDeployment = {
  id: string;
  deployment_type: string;
  repo_id: string;
  entity_id: string;
  provider: string;
  event_actor: PrUser;
  head_branch: string;
  conducted_at: string;
  duration: number;
  status: 'SUCCESS' | 'FAILURE';
  html_url: string;
  pr_count: number;
  meta: MetaData;
};

export type MetaData = {
  id: string;
  repo_workflow_id: string;
  provider_workflow_run_id: string;
  event_actor: string;
  head_branch: string;
  status: 'SUCCESS' | 'FAILURE';
  conducted_at: string;
  duration: number;
  html_url: string;
};

export type UpdatedTeamDeploymentsApiResponse = {
  deployments_map: Record<ID, UpdatedDeployment[]>;
  repos: BaseRepo[];
  workflows: RepoWorkflowExtended[];
};
export type ReqOrgRepo = { org: string; repos: RepoUniqueDetails[] };
export type ReqRepo = {
  org: string;
  idempotency_key: string;
  name: string;
  slug: string;
  deployment_type: DeploymentSources;
  repo_workflows: RepoWorkflow[];
};

export type ReqRepoWithProvider = ReqRepo & { provider: Integration };

export type DoraPropsType = {
  count: number;
  bg: string;
  tooltip: string;
  classification: string;
  icon: OverridableComponent<SvgIconTypeMap<{}, 'svg'>>;
  color: string;
  backgroundColor: string;
  interval: string;
};

export type LeadTimeSummaryApiResponseType = {
  data: {
    status_counts: UserStat;
    pipeline_duration: LeadTimePipelineDuration;
  };
  repos_included: RepoWithSingleWorkflow[];
  all_team_repos: RepoWithSingleWorkflow[];
};

export type CycleTimeSummaryApiResponseType = {
  status_counts: UserStat;
  pipeline_duration: LeadTimePipelineDuration;
  cycle_time_stats: Record<string, number>;
  prev_cycle_time_stats: Record<string, number>;
};

export interface UserStat {
  OPEN: number;
  CLOSED: number;
  MERGED: number;
  REVIEWED: number;
}

export enum OnboardingStep {
  'WELCOME_SCREEN' = 'WELCOME_SCREEN',
  'CODE_PROVIDER_INTEGRATED' = 'CODE_PROVIDER_INTEGRATED',
  'TEAM_CREATED' = 'TEAM_CREATED'
}

export type IntegrationsLinkedAtMap = Record<keyof IntegrationsMap, DateString>;

export type ImageStatusApiResponse = {
  latest_docker_image: string;
  is_update_available: boolean;
};

export type DB_OrgRepo = {
  id: string;
  org_id: string;
  name: string;
  provider: Integration;
  org_name: string;
  is_active: boolean;
  contributors?: null;
  default_branch: string;
  language: string;
  created_at: Date;
  updated_at: Date;
  idempotency_key: string;
  slug: string;
  deployment_type: 'PR_MERGE' | 'WORKFLOW';
  repo_workflows: RepoWorkflow[];
};
