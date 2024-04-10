export const defaultFlags = {
  dummy_function_flag: (_args: { orgId: ID }) => true,
  use_mock_data: false,
  enable_pr_cycle_time_comparison: false,
  use_hotkeys: true,
  show_deployment_settings: false,
  show_incident_settings: false
};

export type Features = typeof defaultFlags;
