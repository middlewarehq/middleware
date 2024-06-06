declare module 'react-chartjs-2';
declare module 'chartjs-plugin-crosshair';
declare module 'chartjs-plugin-trendline';

declare type AnyFunction = (...args: any[]) => any | Promise<any>;
declare type AnyAsyncFunction = (...args: any[]) => Promise<any>;

declare type ID = string;
declare type Timestamp = string;
declare type DateString = string;

declare type Org = {
  id: string;
  created_at: Date;
  name: string;
  domain: string;
  onboarding_state: string[];
  integrations: IntegrationsMap;
};

declare type ONBOARDING_STEP =
  | 'WELCOME_INTRODUCTION_STEP'
  | 'TOOLS_INTEGRATION_STEP'
  | 'TEAM_ONBOARDING_STEP'
  | 'METRICS_AND_KPIS_STEP'
  | 'DATA_ANALYSIS_STEP'
  | 'RECOMMENDATIONS_STEP';

declare type OnboardingState = {
  visited?: {
    balance?: boolean;
    team?: boolean;
    pr_network?: boolean;
    onboarding?: boolean;
  };
  steps_done?: ONBOARDING_STEP[];
  active_step?: ONBOARDING_STEP;
};

declare type IdentityMap = Record<
  string,
  { username: string; meta?: { avatar_url?: string } }
>;

declare type IntegrationsMap = Partial<
  Record<
    'github' | 'gitlab' | 'bitbucket',
    {
      integrated: Boolean;
      linked_at: DateString | null;
      last_synced_at: DateString | null;
    }
  >
>;

declare type User = {
  id: string;
  created_at: Date;
  updated_at: Date;
  org_id: string;
  name: string;
  primary_email: string;
  is_deleted: boolean;
  org?: Org;
  onboarding_state: OnboardingState;
  identities?: IdentityMap;
  integrations?: Partial<IntegrationsMap>;
  avatar_url?: string;
  config?: UserConfig;
};

declare namespace NodeJS {
  export interface ProcessEnv {
    NEXT_PUBLIC_BUILD_TIME: string;
    NEXT_PUBLIC_APP_ENVIRONMENT: 'production' | 'development';
    INTERNAL_API_BASE_URL: string;
    INTERNAL_SYNC_API_BASE_URL: string;
    SECRET_PUBLIC_KEY: string;
    SECRET_PRIVATE_KEY: string;
    DB_HOST: string;
    DB_NAME: string;
    DB_PASS: string;
    DB_PORT: string;
    DB_USER: string;
    MERGE_COMMIT_SHA: string;
    BUILD_DATE: string;
    BEHIND_COMMITS_COUNT?: string
  }
}
