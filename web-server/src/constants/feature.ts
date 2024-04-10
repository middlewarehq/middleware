const DEMO = 'demo';
const DEV = 'development';
const STAGE = 'staging';
// const PROD = 'production';
const INTERNAL = [STAGE, DEV];

const FLEXILOANS_ORG_ID = '113bf31f-2c0d-49a0-8afb-cabf3472a418';
const FLOBIZ_ORG_ID = '9ea3f71e-c936-49e2-8fcc-a7be8123ae85';
const BHARATPE_ORG_ID = 'fa1bb500-16f3-45de-a63e-9a0b368b9b5c';
const HAPPAY_ORG_ID = '1a17f131-4eba-4757-aef7-cbcc8546755c';
const MHQ_PROD = '8e5667c5-a041-41b3-b219-39ad553429b0';
const MHQ_STAGE = '5ad0fd6c-22a6-459d-8963-a3e14fcb6c4b';
export const MIDDLEWARE_ORG_IDS = [MHQ_PROD, MHQ_STAGE];

const ORGS_ENABLED_FOR_FEEDBACK_CYCLE = [FLOBIZ_ORG_ID];
const ORGS_ENABLED_FOR_ONE_ON_ONE = [HAPPAY_ORG_ID];
const ORGS_ENABLED_FOR_COCKPIT = [
  FLEXILOANS_ORG_ID,
  BHARATPE_ORG_ID,
  MHQ_PROD,
  MHQ_STAGE
];

const FEEDBACK_CYCLE_LIMITED_RELEASE = true;
const ONE_ON_ONE_LIMITED_RELEASE = true;
const COCKPIT_LIMITED_RELEASE = false;
const POTENTIAL_BOTTLENECKS_LIMITED_RELEASE = false;
const CSV_LIMITED_RELEASE = false;

const checkFeedbackCycleFlag = ({ orgId }: { orgId: string }) => {
  return FEEDBACK_CYCLE_LIMITED_RELEASE
    ? ORGS_ENABLED_FOR_FEEDBACK_CYCLE.includes(orgId) ||
        [...INTERNAL, DEMO].includes(process.env.NEXT_PUBLIC_APP_ENVIRONMENT)
    : true;
};

const checkCockpitFlag = ({ orgId }: { orgId: string }) => {
  return COCKPIT_LIMITED_RELEASE
    ? ORGS_ENABLED_FOR_COCKPIT.includes(orgId) ||
        [...INTERNAL, DEMO].includes(process.env.NEXT_PUBLIC_APP_ENVIRONMENT)
    : true;
};

const checkBottlenecksFlag = ({ orgId }: { orgId: string }) => {
  return POTENTIAL_BOTTLENECKS_LIMITED_RELEASE
    ? ORGS_ENABLED_FOR_COCKPIT.includes(orgId) ||
        [...INTERNAL, DEMO].includes(process.env.NEXT_PUBLIC_APP_ENVIRONMENT)
    : true;
};

const checkOneOnOneFlag = ({ orgId }: { orgId: string }) => {
  return ONE_ON_ONE_LIMITED_RELEASE
    ? ORGS_ENABLED_FOR_ONE_ON_ONE.includes(orgId)
    : false;
};

const checkFocusAreasFlag = ({ orgId }: { orgId: string }) => {
  return checkCockpitFlag({ orgId });
};

const checkCsvFlag = ({ orgId }: { orgId: string }) => {
  return CSV_LIMITED_RELEASE
    ? MIDDLEWARE_ORG_IDS.includes(orgId) ||
        [...INTERNAL, DEMO].includes(process.env.NEXT_PUBLIC_APP_ENVIRONMENT)
    : true;
};

export const defaultFlags = {
  dummy_function_flag: (_args: { orgId: ID }) => true,
  use_mock_data: process.env.NEXT_PUBLIC_APP_ENVIRONMENT === DEMO,
  show_balance_indicator: process.env.NEXT_PUBLIC_APP_ENVIRONMENT === DEMO,
  show_demo_content: process.env.NEXT_PUBLIC_APP_ENVIRONMENT === DEMO,
  allow_oc_replace: INTERNAL.includes(process.env.NEXT_PUBLIC_APP_ENVIRONMENT),
  hide_template_only_ui: true,
  force_bitbucket_hidden_ui: false,
  enable_1on1_scheduling: false,
  force_role_p0_eng: false,
  force_role_p1_em: false,
  force_role_p2_mom: false,
  disable_trial_ui: INTERNAL.includes(process.env.NEXT_PUBLIC_APP_ENVIRONMENT),
  show_comparison_percentage: false,
  enable_pr_cycle_time_comparison: false,
  enable_cockpit: checkCockpitFlag,
  enable_playbook: true,
  use_hotkeys: INTERNAL.includes(process.env.NEXT_PUBLIC_APP_ENVIRONMENT),
  enable_app_maintenance: false,
  enable_dora_metrics_correlation: INTERNAL.includes(
    process.env.NEXT_PUBLIC_APP_ENVIRONMENT
  ),
  feedback_cycle: checkFeedbackCycleFlag,
  enable_video_onboarding: false,
  enable_ticket_investment_trends: true,
  enable_sprint_details_column: INTERNAL.includes(
    process.env.NEXT_PUBLIC_APP_ENVIRONMENT
  ),
  enable_gitlab: true,
  enable_openai: true,
  enable_pr_exclusion: true,
  enable_pagerduty: true,
  integrations_v2: true,
  hide_notifications_settings: true,
  hide_email_digests: false,
  hide_notifications_settings_page: false,
  enable_version_insights: INTERNAL.includes(
    process.env.NEXT_PUBLIC_APP_ENVIRONMENT
  ),
  enable_adhoc_carryover_trends: true,
  enable_story_points_warning_config: true,
  enable_pr_summary: true,
  enable_circle_ci: true,
  enable_opsgenie: true,
  enable_link_sharing: true,
  enable_org_tree_selector: checkCockpitFlag,
  jira_maintenance: false,
  potential_bottlenecks: checkBottlenecksFlag,
  what_brings_you_here: process.env.NEXT_PUBLIC_APP_ENVIRONMENT !== DEMO,
  received_feedback_recipients_cards: true,
  show_cockpit_highlights: INTERNAL.includes(
    process.env.NEXT_PUBLIC_APP_ENVIRONMENT
  ),
  show_cockpit_focus_areas: checkFocusAreasFlag,
  show_save_current_stats_as_checkpoint: checkFocusAreasFlag,
  show_additional_meta_data: checkFocusAreasFlag,
  show_focus_card_milestone_progress: checkFocusAreasFlag,
  show_tags_in_focus_card: false,
  enable_one_on_one: checkOneOnOneFlag,
  enable_people_nav_items: false,
  enable_time_spent_across_investment_areas: true,
  download_table_csv: checkCsvFlag,
  cross_analyze: INTERNAL.includes(process.env.NEXT_PUBLIC_APP_ENVIRONMENT),
  manage_sprints: [DEV].includes(process.env.NEXT_PUBLIC_APP_ENVIRONMENT),
  show_deployment_settings: INTERNAL.includes(
    process.env.NEXT_PUBLIC_APP_ENVIRONMENT
  ),
  show_incident_settings: false
};

export type Features = typeof defaultFlags;
