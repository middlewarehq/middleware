import { indexBy, prop } from 'ramda';

import { percentWithDecimals } from '@/utils/datatype';
import { generateRandomNumbersWithExactAverageAndRange } from '@/utils/trend';

// Team Map for reference
// ea53d384-c07c-4ee2-8c30-6983977010ff => Foundation
// 23716b7f-42b9-464f-b1c0-b6e2f63fc3d6 => SRE
// 86ba0d83-5802-4153-a6d2-f615953f327a => Infra
// d8133c5d-1fd3-4614-883f-64801a3719c4 => Reliability

// User Map for reference
// b59cb820-93a2-4be4-8594-c82f4636a0c0 => Munish Kumar
// 490f7418-1b15-4b92-a843-6e7089ca87ef => Dhruv Agarwal
const datesMap = {
  current: [
    '2023-10-16T00:00:00+00:00',
    '2023-10-23T00:00:00+00:00',
    '2023-10-30T00:00:00+00:00',
    '2023-11-06T00:00:00+00:00',
    '2023-11-13T00:00:00+00:00'
  ],
  previous: [
    '2023-09-11T00:00:00+00:00',
    '2023-09-18T00:00:00+00:00',
    '2023-09-25T00:00:00+00:00',
    '2023-10-02T00:00:00+00:00',
    '2023-10-09T00:00:00+00:00'
  ]
};

const metrics_config_ids = [
  '506298ee-9d9f-4175-930e-cae18f6c0643',
  '0f717859-a898-4152-9978-61c8db78a405',
  '85bc348b-ec6b-416b-bfed-66ee8dd8d9e2'
];

const managerTeamsMap = indexBy(prop('manager_id'), [
  {
    manager_id: '490f7418-1b15-4b92-a843-6e7089ca87ef' as const, // Dhruv Agarwal
    team_ids: [
      'ea53d384-c07c-4ee2-8c30-6983977010ff',
      '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6'
    ] as const
  },
  {
    manager_id: 'b59cb820-93a2-4be4-8594-c82f4636a0c0' as const, // Munish Kumar
    team_ids: [
      '86ba0d83-5802-4153-a6d2-f615953f327a',
      'd8133c5d-1fd3-4614-883f-64801a3719c4'
    ] as const
  }
]);

const teams_map = {
  'ea53d384-c07c-4ee2-8c30-6983977010ff': {
    id: 'ea53d384-c07c-4ee2-8c30-6983977010ff',
    org_id: 'd4688672-984d-4521-8a0e-b95a18059aa6',
    name: 'Foundation',
    member_ids: ['a94c25b1-e0f1-48f1-bdf2-eef332567ed7'],
    created_at: '2023-10-25T08:44:43.574616+00:00',
    updated_at: '2023-10-25T08:44:43.574616+00:00',
    is_deleted: false
  },
  '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6': {
    id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
    org_id: 'd4688672-984d-4521-8a0e-b95a18059aa6',
    name: 'SRE',
    member_ids: [
      '391420ef-b113-4267-8c08-76c0f5140413',
      '97fb2060-9af2-4f4a-853b-ee1105f00b65',
      'd3731fae-68e9-4ef5-92fb-a7cfb228b888',
      'd28c2f04-eca5-4c86-8527-586d87976ea5',
      'a7ad034e-e1ce-4295-aa89-3e4b92584afb',
      '420489b1-9346-4cdc-86fa-23c0032a7ead'
    ],
    created_at: '2023-05-30T17:35:04.609013+00:00',
    updated_at: '2023-10-17T14:36:35.022000+00:00',
    is_deleted: false
  },
  'd8133c5d-1fd3-4614-883f-64801a3719c4': {
    id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
    org_id: 'd4688672-984d-4521-8a0e-b95a18059aa6',
    name: 'Reliability',
    member_ids: [
      '97fb2060-9af2-4f4a-853b-ee1105f00b65',
      '98cbe22f-f457-48bc-b825-19b1d18d28c5'
    ],
    created_at: '2023-09-05T12:40:49.315291+00:00',
    updated_at: '2023-09-29T17:53:00.458000+00:00',
    is_deleted: false
  },
  '86ba0d83-5802-4153-a6d2-f615953f327a': {
    id: '86ba0d83-5802-4153-a6d2-f615953f327a',
    org_id: 'd4688672-984d-4521-8a0e-b95a18059aa6',
    name: 'Infra',
    member_ids: [
      'd28c2f04-eca5-4c86-8527-586d87976ea5',
      '97fb2060-9af2-4f4a-853b-ee1105f00b65',
      '420489b1-9346-4cdc-86fa-23c0032a7ead',
      'a7ad034e-e1ce-4295-aa89-3e4b92584afb',
      'd3731fae-68e9-4ef5-92fb-a7cfb228b888',
      '391420ef-b113-4267-8c08-76c0f5140413'
    ],
    created_at: '2023-09-24T08:14:37.237438+00:00',
    updated_at: '2023-11-02T23:12:02.415000+00:00',
    is_deleted: false
  }
};

const users_map = {
  '490f7418-1b15-4b92-a843-6e7089ca87ef': {
    id: '490f7418-1b15-4b92-a843-6e7089ca87ef',
    name: 'Dhruv Agarwal',
    email: 'sasas@middlewarehq.com',
    avatar_url: null as null
  },
  'b59cb820-93a2-4be4-8594-c82f4636a0c0': {
    id: 'b59cb820-93a2-4be4-8594-c82f4636a0c0',
    name: 'Munish Kumar',
    email: 'jayant@middlewarehq.com',
    avatar_url: 'https://github.com/jayantbh.png?size=128'
  }
};

const teamsMapForCycleTimeStats = {
  '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6': {
    breakdown: {
      first_response_time: {
        current_average: 102816,
        previous_average: 206496
      },
      merge_time: { current_average: 72576, previous_average: 112320 },
      rework_time: { current_average: 57888, previous_average: 44064 }
    },
    current_average: 77760,
    current_pr_count: 110,
    previous_average: 90720,
    previous_pr_count: 88,
    team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6'
  },
  '86ba0d83-5802-4153-a6d2-f615953f327a': {
    breakdown: {
      first_response_time: { current_average: 86400, previous_average: 149472 },
      merge_time: { current_average: 25920, previous_average: 36288 },
      rework_time: {
        current_average: 43200,
        previous_average: 47520.00000000001
      }
    },
    current_average: 51840,
    current_pr_count: 101,
    previous_average: 77760,
    previous_pr_count: 160,
    team_id: '86ba0d83-5802-4153-a6d2-f615953f327a'
  },
  'd8133c5d-1fd3-4614-883f-64801a3719c4': {
    breakdown: {
      first_response_time: {
        current_average: 105408,
        previous_average: 146016
      },
      merge_time: { current_average: 19008, previous_average: 66528 },
      rework_time: { current_average: 51840, previous_average: 72576 }
    },
    current_average: 69120,
    current_pr_count: 101,
    previous_average: 95040.00000000001,
    previous_pr_count: 160,
    team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4'
  },
  'ea53d384-c07c-4ee2-8c30-6983977010ff': {
    breakdown: {
      first_response_time: {
        current_average: 119231.99999999999,
        previous_average: 174528
      },
      merge_time: {
        current_average: 30239.999999999996,
        previous_average: 73440
      },
      rework_time: { current_average: 44928, previous_average: 76032 }
    },
    current_average: 64800,
    current_pr_count: 101,
    previous_average: 108000,
    previous_pr_count: 160,
    team_id: 'ea53d384-c07c-4ee2-8c30-6983977010ff'
  }
} as const;
const managersMapForCycleTimeStats = calculateManagerStatsForCycleTime();
const cycleTimeBaseStats = calculateBaseStatsForCycleTime();
const cycle_time_stats = {
  ...cycleTimeBaseStats,
  team_analytics: Object.values(teamsMapForCycleTimeStats),
  manager_analytics: Object.values(managersMapForCycleTimeStats)
};

const teamsMapForLeadTimeStats = {
  '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6': {
    team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
    current_average: 155520,
    previous_average: 177120,
    current_pr_count: 101,
    previous_pr_count: 160,
    breakdown: {
      first_commit_to_open: {
        current_average: 100224,
        previous_average: 107136
      },
      first_response_time: {
        current_average: 102816,
        previous_average: 206496
      },
      merge_time: { current_average: 72576, previous_average: 112320 },
      rework_time: { current_average: 57888, previous_average: 44064 },
      merge_to_deploy: { current_average: 55296, previous_average: 65664 }
    }
  },
  '86ba0d83-5802-4153-a6d2-f615953f327a': {
    team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
    current_average: 120960,
    previous_average: 159840,
    current_pr_count: 101,
    previous_pr_count: 160,
    breakdown: {
      first_commit_to_open: {
        current_average: 96768.00000000001,
        previous_average: 118368.00000000001
      },
      first_response_time: { current_average: 86400, previous_average: 149472 },
      merge_time: { current_average: 25920, previous_average: 36288 },
      rework_time: {
        current_average: 43200,
        previous_average: 47520.00000000001
      },
      merge_to_deploy: { current_average: 41472, previous_average: 45792 }
    }
  },
  'd8133c5d-1fd3-4614-883f-64801a3719c4': {
    team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
    current_average: 138240,
    previous_average: 177120,
    current_pr_count: 101,
    previous_pr_count: 160,
    breakdown: {
      first_commit_to_open: {
        current_average: 84672,
        previous_average: 107136
      },
      first_response_time: {
        current_average: 105408,
        previous_average: 146016
      },
      merge_time: { current_average: 19008, previous_average: 66528 },
      rework_time: { current_average: 51840, previous_average: 72576 },
      merge_to_deploy: { current_average: 53568, previous_average: 57024 }
    }
  },
  'ea53d384-c07c-4ee2-8c30-6983977010ff': {
    team_id: 'ea53d384-c07c-4ee2-8c30-6983977010ff',
    current_average: 151200,
    previous_average: 203040,
    current_pr_count: 101,
    previous_pr_count: 160,
    breakdown: {
      first_commit_to_open: {
        current_average: 91584,
        previous_average: 95904.00000000001
      },
      first_response_time: {
        current_average: 119231.99999999999,
        previous_average: 174528
      },
      merge_time: {
        current_average: 30239.999999999996,
        previous_average: 73440
      },
      rework_time: { current_average: 44928, previous_average: 76032 },
      merge_to_deploy: { current_average: 81216, previous_average: 94176 }
    }
  }
};
const managersMapForLeadTimeStats = calculateManagerStatsForLeadTime();
const leadTimeBaseStats = calculateBaseStatsForLeadTime();
const lead_time_stats = {
  ...leadTimeBaseStats,
  team_analytics: Object.values(teamsMapForLeadTimeStats),
  manager_analytics: Object.values(managersMapForLeadTimeStats)
};

const teamsMapForDeploymentFrequencyStats = {
  current: {
    '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6': {
      avg_deployment_frequency: 50,
      team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6'
    },
    '86ba0d83-5802-4153-a6d2-f615953f327a': {
      avg_deployment_frequency: 56,
      team_id: '86ba0d83-5802-4153-a6d2-f615953f327a'
    },
    'd8133c5d-1fd3-4614-883f-64801a3719c4': {
      avg_deployment_frequency: 54,
      team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4'
    },
    'ea53d384-c07c-4ee2-8c30-6983977010ff': {
      avg_deployment_frequency: 52,
      team_id: 'ea53d384-c07c-4ee2-8c30-6983977010ff'
    }
  },
  previous: {
    '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6': {
      avg_deployment_frequency: 42,
      team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6'
    },
    '86ba0d83-5802-4153-a6d2-f615953f327a': {
      avg_deployment_frequency: 38,
      team_id: '86ba0d83-5802-4153-a6d2-f615953f327a'
    },
    'd8133c5d-1fd3-4614-883f-64801a3719c4': {
      avg_deployment_frequency: 35,
      team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4'
    },
    'ea53d384-c07c-4ee2-8c30-6983977010ff': {
      avg_deployment_frequency: 41,
      team_id: 'ea53d384-c07c-4ee2-8c30-6983977010ff'
    }
  }
};
const managerMapForCurrentDeploymentStats =
  calculateManagerStatsForDeploymentFreq(
    teamsMapForDeploymentFrequencyStats.current
  );
const managerMapForPreviousDeploymentStats =
  calculateManagerStatsForDeploymentFreq(
    teamsMapForDeploymentFrequencyStats.previous
  );
const deployment_frequency_stats = {
  current: {
    avg_deployment_frequency: calculateAverage(
      Object.values(managerMapForCurrentDeploymentStats),
      'avg_deployment_frequency'
    ),
    team_analytics: Object.values(teamsMapForDeploymentFrequencyStats.current),
    manager_analytics: Object.values(managerMapForCurrentDeploymentStats)
  },
  previous: {
    avg_deployment_frequency: calculateAverage(
      Object.values(managerMapForPreviousDeploymentStats),
      'avg_deployment_frequency'
    ),
    team_analytics: Object.values(teamsMapForDeploymentFrequencyStats.previous),
    manager_analytics: Object.values(managerMapForPreviousDeploymentStats)
  }
};

const teamsMapForCfrStats = {
  current: {
    '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6': {
      change_failure_rate: 2.6,
      failed_deployments: 10,
      team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
      total_deployments: 385
    },
    '86ba0d83-5802-4153-a6d2-f615953f327a': {
      change_failure_rate: 1.87,
      failed_deployments: 5,
      team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
      total_deployments: 268
    },
    'd8133c5d-1fd3-4614-883f-64801a3719c4': {
      change_failure_rate: 2.58,
      failed_deployments: 6,
      team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
      total_deployments: 233
    },
    'ea53d384-c07c-4ee2-8c30-6983977010ff': {
      // Foundation
      change_failure_rate: 10.55,
      failed_deployments: 17,
      team_id: 'ea53d384-c07c-4ee2-8c30-6983977010ff',
      total_deployments: 162
    }
  },
  previous: {
    '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6': {
      change_failure_rate: 5.71,
      failed_deployments: 20,
      team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
      total_deployments: 350
    },
    '86ba0d83-5802-4153-a6d2-f615953f327a': {
      change_failure_rate: 3.11,
      failed_deployments: 9,
      team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
      total_deployments: 289
    },
    'd8133c5d-1fd3-4614-883f-64801a3719c4': {
      change_failure_rate: 2.7,
      failed_deployments: 6,
      team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
      total_deployments: 220
    },
    'ea53d384-c07c-4ee2-8c30-6983977010ff': {
      change_failure_rate: 12.16,
      failed_deployments: 23,
      team_id: 'ea53d384-c07c-4ee2-8c30-6983977010ff',
      total_deployments: 189
    }
  }
};
const managerMapForCurrentCfrStats = calculateManagerStatsForCfr(
  teamsMapForCfrStats.current
);
const managerMapForPreviousCfrStats = calculateManagerStatsForCfr(
  teamsMapForCfrStats.previous
);
const change_failure_rate_stats = {
  current: {
    change_failure_rate: calculateAverage(
      Object.values(managerMapForCurrentCfrStats),
      'change_failure_rate'
    ),
    failed_deployments: calculateSum(
      Object.values(managerMapForCurrentCfrStats),
      'failed_deployments'
    ),
    total_deployments: calculateSum(
      Object.values(managerMapForCurrentCfrStats),
      'total_deployments'
    ),
    team_analytics: Object.values(teamsMapForCfrStats.current),
    manager_analytics: Object.values(managerMapForCurrentCfrStats)
  },
  previous: {
    change_failure_rate: calculateAverage(
      Object.values(managerMapForPreviousCfrStats),
      'change_failure_rate'
    ),
    failed_deployments: calculateSum(
      Object.values(managerMapForPreviousCfrStats),
      'failed_deployments'
    ),
    total_deployments: calculateSum(
      Object.values(managerMapForPreviousCfrStats),
      'total_deployments'
    ),
    team_analytics: Object.values(teamsMapForCfrStats.previous),
    manager_analytics: Object.values(managerMapForPreviousCfrStats)
  }
};

const teamsMapForMtrStats = {
  current: {
    '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6': {
      incident_count: 1,
      team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
      time_to_restore_average: 64800
    },
    '86ba0d83-5802-4153-a6d2-f615953f327a': {
      incident_count: 1,
      team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
      time_to_restore_average: 43200
    },
    'd8133c5d-1fd3-4614-883f-64801a3719c4': {
      incident_count: 1,
      team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
      time_to_restore_average: 86400
    },
    'ea53d384-c07c-4ee2-8c30-6983977010ff': {
      incident_count: 1,
      team_id: 'ea53d384-c07c-4ee2-8c30-6983977010ff',
      time_to_restore_average: 21600
    }
  },
  previous: {
    '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6': {
      incident_count: 1,
      team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
      time_to_restore_average: 69120
    },
    '86ba0d83-5802-4153-a6d2-f615953f327a': {
      incident_count: 1,
      team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
      time_to_restore_average: 56160
    },
    'd8133c5d-1fd3-4614-883f-64801a3719c4': {
      incident_count: 1,
      team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
      time_to_restore_average: 90720
    },
    'ea53d384-c07c-4ee2-8c30-6983977010ff': {
      incident_count: 1,
      team_id: 'ea53d384-c07c-4ee2-8c30-6983977010ff',
      time_to_restore_average: 34560
    }
  }
};
const managerMapForCurrentMtrStats = calculateManagerStatsForMtr(
  teamsMapForMtrStats.current
);
const managerMapForPreviousMtrStats = calculateManagerStatsForMtr(
  teamsMapForMtrStats.previous
);
const mean_time_to_restore_stats = {
  current: {
    incident_count: calculateSum(
      Object.values(managerMapForCurrentMtrStats),
      'incident_count'
    ),
    time_to_restore_average: calculateAverage(
      Object.values(managerMapForCurrentMtrStats),
      'time_to_restore_average'
    ),
    team_analytics: Object.values(teamsMapForMtrStats.current),
    manager_analytics: Object.values(managerMapForCurrentMtrStats)
  },
  previous: {
    incident_count: calculateSum(
      Object.values(managerMapForPreviousMtrStats),
      'incident_count'
    ),
    time_to_restore_average: calculateAverage(
      Object.values(managerMapForPreviousMtrStats),
      'time_to_restore_average'
    ),
    team_analytics: Object.values(teamsMapForMtrStats.previous),
    manager_analytics: Object.values(managerMapForPreviousMtrStats)
  }
};
const cycle_time_trends = calculateCycleTimeTrends();
const lead_time_trends = calculateLeadTimeTrends();
const deployment_frequency_trends = calculateDeploymentFrequencyTrends();
const change_failure_rate_trends = calculateChangeFailureRateTrends();
const mean_time_to_restore_trends = calculateMeanTimeToRestoreTrends();

export const cockpitV2MockData = {
  teams_map,
  users_map,
  cycle_time_stats,
  lead_time_stats,
  cycle_time_trends,
  lead_time_trends,

  bugs_percentage_stats: {
    current: {
      count: 4,
      total_count: 100,
      team_analytics: [
        {
          team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
          count: 0,
          total_count: 59,
          bugs_percentage: 7
        },
        {
          team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
          count: 0,
          total_count: 2,
          bugs_percentage: 1
        },
        {
          team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
          count: 0,
          total_count: 59,
          bugs_percentage: 2
        },
        {
          team_id: 'ea53d384-c07c-4ee2-8c30-6983977010ff',
          count: 0,
          total_count: 0,
          bugs_percentage: 3
        }
      ],
      manager_analytics: [
        {
          manager_id: 'b59cb820-93a2-4be4-8594-c82f4636a0c0',
          team_ids: [
            '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
            '86ba0d83-5802-4153-a6d2-f615953f327a'
          ],
          count: 23,
          total_count: 100,
          bugs_percentage: 2.3
        },
        {
          manager_id: '490f7418-1b15-4b92-a843-6e7089ca87ef',
          team_ids: ['d8133c5d-1fd3-4614-883f-64801a3719c4'],
          count: 30,
          total_count: 30,
          bugs_percentage: 10.0
        }
      ],
      bugs_percentage: 4
    },
    previous: {
      count: 11,
      total_count: 100,
      team_analytics: [
        {
          team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
          count: 1,
          total_count: 14,
          bugs_percentage: 7
        },
        {
          team_id: 'ea53d384-c07c-4ee2-8c30-6983977010ff',
          count: 0,
          total_count: 0,
          bugs_percentage: 0
        },
        {
          team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
          count: 20,
          total_count: 99,
          bugs_percentage: 20
        },
        {
          team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
          count: 20,
          total_count: 99,
          bugs_percentage: 20
        }
      ],
      manager_analytics: [
        {
          manager_id: 'b59cb820-93a2-4be4-8594-c82f4636a0c0',
          team_ids: [
            '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
            '86ba0d83-5802-4153-a6d2-f615953f327a'
          ],
          count: 41,
          total_count: 212,
          bugs_percentage: 19
        },
        {
          manager_id: '490f7418-1b15-4b92-a843-6e7089ca87ef',
          team_ids: ['d8133c5d-1fd3-4614-883f-64801a3719c4'],
          count: 20,
          total_count: 99,
          bugs_percentage: 20
        }
      ],
      bugs_percentage: 11
    }
  },
  prs_merged_without_review_stats: {
    current: {
      count: 0,
      total_count: 313,
      team_analytics: [
        {
          team_id: 'ea53d384-c07c-4ee2-8c30-6983977010ff',
          count: 0,
          total_count: 1
        },
        {
          team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
          count: 0,
          total_count: 101
        },
        {
          team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
          count: 0,
          total_count: 101
        },
        {
          team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
          count: 0,
          total_count: 110
        }
      ],
      manager_analytics: [
        {
          manager_id: 'b59cb820-93a2-4be4-8594-c82f4636a0c0',
          team_ids: [
            '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
            '86ba0d83-5802-4153-a6d2-f615953f327a'
          ],
          count: 0,
          total_count: 211
        },
        {
          manager_id: '490f7418-1b15-4b92-a843-6e7089ca87ef',
          team_ids: ['d8133c5d-1fd3-4614-883f-64801a3719c4'],
          count: 0,
          total_count: 101
        }
      ]
    },
    previous: {
      count: 4,
      total_count: 411,
      team_analytics: [
        {
          team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
          count: 1,
          total_count: 160
        },
        {
          team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
          count: 1,
          total_count: 160
        },
        {
          team_id: 'ea53d384-c07c-4ee2-8c30-6983977010ff',
          count: 2,
          total_count: 3
        },
        {
          team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
          count: 0,
          total_count: 88
        }
      ],
      manager_analytics: [
        {
          manager_id: 'b59cb820-93a2-4be4-8594-c82f4636a0c0',
          team_ids: [
            '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
            '86ba0d83-5802-4153-a6d2-f615953f327a'
          ],
          count: 1,
          total_count: 248
        },
        {
          manager_id: '490f7418-1b15-4b92-a843-6e7089ca87ef',
          team_ids: ['d8133c5d-1fd3-4614-883f-64801a3719c4'],
          count: 1,
          total_count: 160
        }
      ]
    }
  },
  prs_merged_quickly_stats: {
    current: {
      count: 210,
      total_count: 313,
      team_analytics: [
        {
          team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
          count: 67,
          total_count: 101
        },
        {
          team_id: 'ea53d384-c07c-4ee2-8c30-6983977010ff',
          count: 1,
          total_count: 1
        },
        {
          team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
          count: 67,
          total_count: 101
        },
        {
          team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
          count: 75,
          total_count: 110
        }
      ],
      manager_analytics: [
        {
          manager_id: 'b59cb820-93a2-4be4-8594-c82f4636a0c0',
          team_ids: [
            '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
            '86ba0d83-5802-4153-a6d2-f615953f327a'
          ],
          count: 142,
          total_count: 211
        },
        {
          manager_id: '490f7418-1b15-4b92-a843-6e7089ca87ef',
          team_ids: ['d8133c5d-1fd3-4614-883f-64801a3719c4'],
          count: 67,
          total_count: 101
        }
      ]
    },
    previous: {
      count: 200,
      total_count: 411,
      team_analytics: [
        {
          team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
          count: 123,
          total_count: 160
        },
        {
          team_id: 'ea53d384-c07c-4ee2-8c30-6983977010ff',
          count: 1,
          total_count: 3
        },
        {
          team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
          count: 123,
          total_count: 160
        },
        {
          team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
          count: 45,
          total_count: 88
        }
      ],
      manager_analytics: [
        {
          manager_id: 'b59cb820-93a2-4be4-8594-c82f4636a0c0',
          team_ids: [
            '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
            '86ba0d83-5802-4153-a6d2-f615953f327a'
          ],
          count: 168,
          total_count: 248
        },
        {
          manager_id: '490f7418-1b15-4b92-a843-6e7089ca87ef',
          team_ids: ['d8133c5d-1fd3-4614-883f-64801a3719c4'],
          count: 123,
          total_count: 160
        }
      ]
    }
  },
  prs_merged_without_review_trends: {
    '2023-10-16T00:00:00+00:00': {
      count: null as null,
      total_count: 4
    },
    '2023-10-23T00:00:00+00:00': {
      count: null as null,
      total_count: 2
    },
    '2023-10-30T00:00:00+00:00': {
      count: null as null,
      total_count: 111
    },
    '2023-11-06T00:00:00+00:00': {
      count: null as null,
      total_count: 61
    },
    '2023-11-13T00:00:00+00:00': {
      count: null as null,
      total_count: 46
    },
    '2023-09-11T00:00:00+00:00': {
      count: 2,
      total_count: 53
    },
    '2023-09-18T00:00:00+00:00': {
      count: null as null,
      total_count: 70
    },
    '2023-09-25T00:00:00+00:00': {
      count: 2,
      total_count: 43
    },
    '2023-10-02T00:00:00+00:00': {
      count: 2,
      total_count: 189
    },
    '2023-10-09T00:00:00+00:00': {
      count: null as null,
      total_count: 65
    }
  },
  bugs_percentage_trends: {
    '2023-09-11T00:00:00+00:00': {
      count: 1,
      total_count: 13,
      bugs_percentage: 11
    },
    '2023-09-18T00:00:00+00:00': {
      count: 16,
      total_count: 43,
      bugs_percentage: 10.6
    },
    '2023-09-25T00:00:00+00:00': {
      count: 5,
      total_count: 32,
      bugs_percentage: 10.2
    },
    '2023-10-02T00:00:00+00:00': {
      count: 2,
      total_count: 27,
      bugs_percentage: 8.9
    },
    '2023-10-09T00:00:00+00:00': {
      count: null as null,
      total_count: 37,
      bugs_percentage: 8.3
    },
    '2023-10-16T00:00:00+00:00': {
      count: null as null,
      total_count: 31,
      bugs_percentage: 6.3
    },
    '2023-10-23T00:00:00+00:00': {
      count: null as null,
      total_count: 9,
      bugs_percentage: 5.5
    },
    '2023-10-30T00:00:00+00:00': {
      count: null as null,
      total_count: 18,
      bugs_percentage: 5.2
    },
    '2023-11-06T00:00:00+00:00': {
      count: null as null,
      total_count: 13,
      bugs_percentage: 4.0
    },
    '2023-11-13T00:00:00+00:00': {
      count: null as null,
      total_count: 10,
      bugs_percentage: 4.0
    }
  },
  prs_merged_quickly_trends: {
    '2023-09-11T00:00:00+00:00': {
      count: 30,
      total_count: 100
    },
    '2023-09-18T00:00:00+00:00': {
      count: 20,
      total_count: 100
    },
    '2023-09-25T00:00:00+00:00': {
      count: 50,
      total_count: 100
    },
    '2023-10-02T00:00:00+00:00': {
      count: 40,
      total_count: 100
    },
    '2023-10-09T00:00:00+00:00': {
      count: 30,
      total_count: 100
    },
    '2023-10-16T00:00:00+00:00': {
      count: 40,
      total_count: 100
    },
    '2023-10-23T00:00:00+00:00': {
      count: 50,
      total_count: 100
    },
    '2023-10-30T00:00:00+00:00': {
      count: 50,
      total_count: 100
    },
    '2023-11-06T00:00:00+00:00': {
      count: 60,
      total_count: 100
    },
    '2023-11-13T00:00:00+00:00': {
      count: 40,
      total_count: 100
    }
  },
  planned_ticket_success_percentage: {
    current: {
      count: 4,
      total_count: 15,
      team_analytics: [
        {
          team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
          count: 3,
          total_count: 3,
          percentage: 100
        },
        {
          team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
          count: 0,
          total_count: 0,
          percentage: 0
        },
        {
          team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
          count: 0,
          total_count: 0,
          percentage: 0
        }
      ],
      manager_analytics: [
        {
          manager_id: 'b59cb820-93a2-4be4-8594-c82f4636a0c0',
          team_ids: [
            '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
            '86ba0d83-5802-4153-a6d2-f615953f327a'
          ],
          count: 4,
          total_count: 15,
          percentage: 27
        },
        {
          manager_id: '490f7418-1b15-4b92-a843-6e7089ca87ef',
          team_ids: ['d8133c5d-1fd3-4614-883f-64801a3719c4'],
          count: 0,
          total_count: 0,
          percentage: 0
        }
      ],
      percentage: 27
    },
    previous: {
      count: 22,
      total_count: 88,
      team_analytics: [
        {
          team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
          count: 5,
          total_count: 91,
          percentage: 5
        },
        {
          team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
          count: 7,
          total_count: 11,
          percentage: 64
        },
        {
          team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
          count: 5,
          total_count: 91,
          percentage: 5
        }
      ],
      manager_analytics: [
        {
          manager_id: 'b59cb820-93a2-4be4-8594-c82f4636a0c0',
          team_ids: [
            '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
            '86ba0d83-5802-4153-a6d2-f615953f327a'
          ],
          count: 17,
          total_count: 66
        },
        {
          manager_id: '490f7418-1b15-4b92-a843-6e7089ca87ef',
          team_ids: ['d8133c5d-1fd3-4614-883f-64801a3719c4'],
          count: 5,
          total_count: 22,
          percentage: 23
        }
      ],
      percentage: 25
    }
  },
  planned_ticket_success_trends: {
    '2023-09-18T00:00:00+00:00': {
      count: 50,
      total_count: 190,
      percentage: 5.6
    },
    '2023-09-25T00:00:00+00:00': {
      count: 0,
      total_count: 0,
      percentage: 10.1
    },
    '2023-10-02T00:00:00+00:00': {
      count: 10,
      total_count: 15,
      percentage: 12.3
    },
    '2023-10-09T00:00:00+00:00': {
      count: 0,
      total_count: 0,
      percentage: 14.5
    },
    '2023-10-16T00:00:00+00:00': {
      count: 0,
      total_count: 5,
      percentage: 19.0
    },
    '2023-10-23T00:00:00+00:00': {
      count: 0,
      total_count: 0,
      percentage: 16.8
    },
    '2023-10-30T00:00:00+00:00': {
      count: 0,
      total_count: 4,
      percentage: 24.0
    },
    '2023-11-06T00:00:00+00:00': {
      count: 0,
      total_count: 0,
      percentage: 23.5
    },
    '2023-11-13T00:00:00+00:00': {
      count: 2,
      total_count: 18,
      percentage: 27.0
    },
    '2023-09-11T00:00:00+00:00': {
      count: 0,
      total_count: 0,
      percentage: 6.6
    }
  },
  prs_reverted_stats: {
    current: {
      count: 4,
      total_count: 15,
      team_analytics: [
        {
          team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
          count: 2,
          total_count: 3
        },
        {
          team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
          count: 4,
          total_count: 0
        },
        {
          team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
          count: 6,
          total_count: 0
        }
      ],
      manager_analytics: [
        {
          manager_id: 'b59cb820-93a2-4be4-8594-c82f4636a0c0',
          team_ids: [
            '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
            '86ba0d83-5802-4153-a6d2-f615953f327a'
          ],
          count: 4,
          total_count: 15
        },
        {
          manager_id: '490f7418-1b15-4b92-a843-6e7089ca87ef',
          team_ids: ['d8133c5d-1fd3-4614-883f-64801a3719c4'],
          count: 4,
          total_count: 0
        }
      ]
    },
    previous: {
      count: 22,
      total_count: 88,
      team_analytics: [
        {
          team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
          count: 5,
          total_count: 91
        },
        {
          team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
          count: 7,
          total_count: 11
        },
        {
          team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
          count: 5,
          total_count: 91
        }
      ],
      manager_analytics: [
        {
          manager_id: 'b59cb820-93a2-4be4-8594-c82f4636a0c0',
          team_ids: [
            '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
            '86ba0d83-5802-4153-a6d2-f615953f327a'
          ],
          count: 17,
          total_count: 66
        },
        {
          manager_id: '490f7418-1b15-4b92-a843-6e7089ca87ef',
          team_ids: ['d8133c5d-1fd3-4614-883f-64801a3719c4'],
          count: 5,
          total_count: 22
        }
      ]
    }
  },
  prs_reverted_trends: {
    '2023-10-16T00:00:00+00:00': {
      count: 2,
      total_count: 0
    },
    '2023-10-23T00:00:00+00:00': {
      count: 1,
      total_count: 0
    },
    '2023-10-30T00:00:00+00:00': {
      count: 0,
      total_count: 0
    },
    '2023-11-06T00:00:00+00:00': {
      count: 0,
      total_count: 0
    },
    '2023-11-13T00:00:00+00:00': {
      count: 0,
      total_count: 3
    },
    '2023-09-11T00:00:00+00:00': {
      count: 5,
      total_count: 0
    },
    '2023-09-18T00:00:00+00:00': {
      count: 4,
      total_count: 0
    },
    '2023-09-25T00:00:00+00:00': {
      count: 4,
      total_count: 0
    },
    '2023-10-02T00:00:00+00:00': {
      count: 2,
      total_count: 0
    },
    '2023-10-09T00:00:00+00:00': {
      count: 1,
      total_count: 0
    }
  },
  bugs_in_progress_time_stats: {
    current: {
      average: 63023,
      team_analytics: [
        {
          team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
          average: 108041
        },
        {
          team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
          average: 81030
        },
        {
          team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
          average: 0
        }
      ],
      manager_analytics: [
        {
          manager_id: 'b59cb820-93a2-4be4-8594-c82f4636a0c0',
          team_ids: [
            '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
            '86ba0d83-5802-4153-a6d2-f615953f327a'
          ],
          average: 108041 / 2
        },
        {
          manager_id: '490f7418-1b15-4b92-a843-6e7089ca87ef',
          team_ids: ['d8133c5d-1fd3-4614-883f-64801a3719c4'],
          average: 81030
        }
      ]
    },
    previous: {
      average: 54370,
      team_analytics: [
        {
          team_id: 'd8133c5d-1fd3-4614-883f-64801a3719c4',
          average: 93206
        },
        {
          team_id: '86ba0d83-5802-4153-a6d2-f615953f327a',
          average: 93206 * 0.75
        },
        {
          team_id: '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
          average: 0
        }
      ],
      manager_analytics: [
        {
          manager_id: 'b59cb820-93a2-4be4-8594-c82f4636a0c0',
          team_ids: [
            '23716b7f-42b9-464f-b1c0-b6e2f63fc3d6',
            '86ba0d83-5802-4153-a6d2-f615953f327a'
          ],
          average: 93206 / 2
        },
        {
          manager_id: '490f7418-1b15-4b92-a843-6e7089ca87ef',
          team_ids: ['d8133c5d-1fd3-4614-883f-64801a3719c4'],
          average: 93206 * 0.75
        }
      ]
    }
  },
  bugs_in_progress_time_trends: {
    '2023-10-16T00:00:00+00:00': {
      average: 35650
    },
    '2023-10-23T00:00:00+00:00': {
      average: 201730
    },
    '2023-10-30T00:00:00+00:00': {
      average: 25217
    },
    '2023-11-06T00:00:00+00:00': {
      average: 25217
    },
    '2023-11-13T00:00:00+00:00': {
      average: 6849
    },
    '2023-09-11T00:00:00+00:00': {
      average: 401477
    },
    '2023-09-18T00:00:00+00:00': {
      average: 35650
    },
    '2023-09-25T00:00:00+00:00': {
      average: 355768
    },
    '2023-10-02T00:00:00+00:00': {
      average: 201730
    },
    '2023-10-09T00:00:00+00:00': {
      average: 101268
    }
  },
  mean_time_to_restore_stats,
  mean_time_to_restore_trends,
  change_failure_rate_stats,
  change_failure_rate_trends,
  deployment_frequency_stats,
  deployment_frequency_trends,
  prev_cycle_start_day: '2024-01-12T00:00:00+00:00',
  prev_cycle_end_day: '2024-02-09T00:00:00+00:00'
};

export const userMetricConfigurationsBasedInsightsMock = {
  teams_map,
  users_map,
  metrics_config_ids
};

export const UiPreferencesData = {};

function calculateManagerStatsForCycleTime() {
  const cycleTimeAnalyticsForManagers = Object.values(managerTeamsMap).map(
    ({ manager_id, team_ids }) => {
      const teamsData = team_ids.map(
        (team_id) => teamsMapForCycleTimeStats[team_id]
      );
      const current_average = calculateAverage(teamsData, 'current_average');
      const previous_average = calculateAverage(teamsData, 'previous_average');

      const frtBreakdown = calculateBreakdownAverages(
        teamsData,
        'first_response_time'
      );
      const reworkBreakdown = calculateBreakdownAverages(
        teamsData,
        'rework_time'
      );
      const mergeTimeBreakdown = calculateBreakdownAverages(
        teamsData,
        'merge_time'
      );

      return {
        manager_id,
        team_ids,
        current_average,
        previous_average,
        breakdown: {
          first_response_time: frtBreakdown,
          rework_time: reworkBreakdown,
          merge_time: mergeTimeBreakdown
        }
      };
    }
  );
  return indexBy(prop('manager_id'), cycleTimeAnalyticsForManagers);
}

function calculateManagerStatsForLeadTime() {
  const leadTimeAnalyticsForManagers = Object.values(managerTeamsMap).map(
    ({ manager_id, team_ids }) => {
      const teamsData = team_ids.map(
        (team_id) => teamsMapForLeadTimeStats[team_id]
      );
      const current_average = calculateAverage(teamsData, 'current_average');
      const previous_average = calculateAverage(teamsData, 'previous_average');

      const firstCommitToOpenBreakdown = calculateBreakdownAverages(
        teamsData,
        'first_commit_to_open'
      );
      const frtBreakdown = calculateBreakdownAverages(
        teamsData,
        'first_response_time'
      );
      const reworkBreakdown = calculateBreakdownAverages(
        teamsData,
        'rework_time'
      );
      const mergeTimeBreakdown = calculateBreakdownAverages(
        teamsData,
        'merge_time'
      );
      const mergeToDeployBreakdown = calculateBreakdownAverages(
        teamsData,
        'merge_to_deploy'
      );

      return {
        manager_id,
        team_ids,
        current_average,
        previous_average,
        breakdown: {
          first_commit_to_open: firstCommitToOpenBreakdown,
          first_response_time: frtBreakdown,
          rework_time: reworkBreakdown,
          merge_time: mergeTimeBreakdown,
          merge_to_deploy: mergeToDeployBreakdown
        }
      };
    }
  );
  return indexBy(prop('manager_id'), leadTimeAnalyticsForManagers);
}

function calculateManagerStatsForCfr(teamMapForCfrStats: any) {
  const cfrAnalyticsForManagers = Object.values(managerTeamsMap).map(
    ({ manager_id, team_ids }) => {
      const teamsData = team_ids.map((team_id) => teamMapForCfrStats[team_id]);
      const change_failure_rate = calculateAverage(
        teamsData,
        'change_failure_rate'
      );
      const failed_deployments = calculateSum(teamsData, 'failed_deployments');
      const total_deployments = calculateSum(teamsData, 'total_deployments');

      return {
        manager_id,
        team_ids,
        change_failure_rate,
        failed_deployments,
        total_deployments
      };
    }
  );
  return indexBy(prop('manager_id'), cfrAnalyticsForManagers);
}

function calculateManagerStatsForDeploymentFreq(
  teamsMapForDeploymentFrequencyStats: any
) {
  const deploymentAnalyticsForManagers = Object.values(managerTeamsMap).map(
    ({ manager_id, team_ids }) => {
      const teamsData = team_ids.map(
        (team_id) => teamsMapForDeploymentFrequencyStats[team_id]
      );
      const avg_deployment_frequency = calculateAverage(
        teamsData,
        'avg_deployment_frequency'
      );
      return {
        manager_id,
        team_ids,
        avg_deployment_frequency
      };
    }
  );
  return indexBy(prop('manager_id'), deploymentAnalyticsForManagers);
}

function calculateManagerStatsForMtr(teamsMapForMtrStats: any) {
  const mtrAnalyticsForManagers = Object.values(managerTeamsMap).map(
    ({ manager_id, team_ids }) => {
      const teamsData = team_ids.map((team_id) => teamsMapForMtrStats[team_id]);
      const time_to_restore_average = calculateAverage(
        teamsData,
        'time_to_restore_average'
      );
      const incident_count = calculateSum(teamsData, 'incident_count');
      return {
        manager_id,
        team_ids,
        time_to_restore_average,
        incident_count
      };
    }
  );
  return indexBy(prop('manager_id'), mtrAnalyticsForManagers);
}

function calculateBaseStatsForCycleTime() {
  const teamsData = Object.values(teamsMapForCycleTimeStats);
  const current_average = calculateAverage(teamsData, 'current_average');
  const previous_average = calculateAverage(teamsData, 'previous_average');

  const frtBreakdown = calculateBreakdownAverages(
    teamsData,
    'first_response_time'
  );
  const reworkBreakdown = calculateBreakdownAverages(teamsData, 'rework_time');
  const mergeTimeBreakdown = calculateBreakdownAverages(
    teamsData,
    'merge_time'
  );

  return {
    current_average,
    previous_average,
    breakdown: {
      first_response_time: frtBreakdown,
      rework_time: reworkBreakdown,
      merge_time: mergeTimeBreakdown
    }
  };
}
function calculateBaseStatsForLeadTime() {
  const teamsData = Object.values(teamsMapForLeadTimeStats);
  const current_average = calculateAverage(teamsData, 'current_average');
  const previous_average = calculateAverage(teamsData, 'previous_average');
  const firstCommitToOpenBreakdown = calculateBreakdownAverages(
    teamsData,
    'first_commit_to_open'
  );
  const frtBreakdown = calculateBreakdownAverages(
    teamsData,
    'first_response_time'
  );
  const reworkBreakdown = calculateBreakdownAverages(teamsData, 'rework_time');
  const mergeTimeBreakdown = calculateBreakdownAverages(
    teamsData,
    'merge_time'
  );
  const mergeToDeployBreakdown = calculateBreakdownAverages(
    teamsData,
    'merge_to_deploy'
  );

  return {
    current_average,
    previous_average,
    breakdown: {
      first_commit_to_open: firstCommitToOpenBreakdown,
      first_response_time: frtBreakdown,
      rework_time: reworkBreakdown,
      merge_time: mergeTimeBreakdown,
      merge_to_deploy: mergeToDeployBreakdown
    }
  };
}

function calculateCycleTimeTrends() {
  const averageStatsBreakdown = cycleTimeBaseStats.breakdown;

  const { current: frtCurrentTrends, previous: frtPreviousTrends } =
    computeTrendsArrayForAverages(
      averageStatsBreakdown.first_response_time.previous_average,
      averageStatsBreakdown.first_response_time.current_average
    );
  const { current: reworkCurrentTrends, previous: reworkPreviousTrends } =
    computeTrendsArrayForAverages(
      averageStatsBreakdown.rework_time.previous_average,
      averageStatsBreakdown.rework_time.current_average
    );
  const { current: mergeCurrentTrends, previous: mergePreviousTrends } =
    computeTrendsArrayForAverages(
      averageStatsBreakdown.merge_time.previous_average,
      averageStatsBreakdown.merge_time.current_average
    );
  const currentCycleTime = datesMap.current.map((date, index) => [
    date,
    frtCurrentTrends[index][1] +
      reworkCurrentTrends[index][1] +
      mergeCurrentTrends[index][1]
  ]);
  const previousCycleTime = datesMap.current.map((date, index) => [
    date,
    frtPreviousTrends[index][1] +
      reworkPreviousTrends[index][1] +
      mergePreviousTrends[index][1]
  ]);

  return {
    current: {
      cycle_time: currentCycleTime,
      breakdown: {
        first_response_time: frtCurrentTrends,
        rework_time: reworkCurrentTrends,
        merge_time: mergeCurrentTrends
      }
    },
    previous: {
      cycle_time: previousCycleTime,
      breakdown: {
        first_response_time: frtPreviousTrends,
        rework_time: reworkPreviousTrends,
        merge_time: mergePreviousTrends
      }
    }
  };
}
function calculateLeadTimeTrends() {
  const averageStatsBreakdown = leadTimeBaseStats.breakdown;
  const {
    current: firstCommitToOpenCurrentTrends,
    previous: firstCommitToOpenPreviousTrends
  } = computeTrendsArrayForAverages(
    averageStatsBreakdown.first_commit_to_open.previous_average,
    averageStatsBreakdown.first_commit_to_open.current_average
  );
  const { current: frtCurrentTrends, previous: frtPreviousTrends } =
    computeTrendsArrayForAverages(
      averageStatsBreakdown.first_response_time.previous_average,
      averageStatsBreakdown.first_response_time.current_average
    );
  const { current: reworkCurrentTrends, previous: reworkPreviousTrends } =
    computeTrendsArrayForAverages(
      averageStatsBreakdown.rework_time.previous_average,
      averageStatsBreakdown.rework_time.current_average
    );
  const { current: mergeCurrentTrends, previous: mergePreviousTrends } =
    computeTrendsArrayForAverages(
      averageStatsBreakdown.merge_time.previous_average,
      averageStatsBreakdown.merge_time.current_average
    );
  const {
    current: mergeToDeployCurrentTrends,
    previous: mergeToDeployPreviousTrends
  } = computeTrendsArrayForAverages(
    averageStatsBreakdown.merge_to_deploy.previous_average,
    averageStatsBreakdown.merge_to_deploy.current_average
  );
  const currentLeadTime = datesMap.current.map((date, index) => [
    date,
    firstCommitToOpenCurrentTrends[index][1] +
      frtCurrentTrends[index][1] +
      reworkCurrentTrends[index][1] +
      mergeCurrentTrends[index][1] +
      mergeToDeployCurrentTrends[index][1]
  ]);
  const previousLeadTime = datesMap.current.map((date, index) => [
    date,
    firstCommitToOpenPreviousTrends[index][1] +
      frtPreviousTrends[index][1] +
      reworkPreviousTrends[index][1] +
      mergePreviousTrends[index][1] +
      mergeToDeployPreviousTrends[index][1]
  ]);

  return {
    current: {
      lead_time: currentLeadTime,
      breakdown: {
        first_commit_to_open: firstCommitToOpenCurrentTrends,
        first_response_time: frtCurrentTrends,
        rework_time: reworkCurrentTrends,
        merge_time: mergeCurrentTrends,
        merge_to_deploy: mergeToDeployCurrentTrends
      }
    },
    previous: {
      lead_time: previousLeadTime,
      breakdown: {
        first_commit_to_open: firstCommitToOpenPreviousTrends,
        first_response_time: frtPreviousTrends,
        rework_time: reworkPreviousTrends,
        merge_time: mergePreviousTrends,
        merge_to_deploy: mergeToDeployPreviousTrends
      }
    }
  };
}
function calculateDeploymentFrequencyTrends() {
  const currentDeploymentFrequencyStats = deployment_frequency_stats.current;
  const previousDeploymentFrequencyStats = deployment_frequency_stats.previous;
  const {
    current: deploymentFrequencyCurrentTrends,
    previous: deploymentFrequencyPreviousTrends
  } = computeTrendsArrayForAverages(
    previousDeploymentFrequencyStats.avg_deployment_frequency,
    currentDeploymentFrequencyStats.avg_deployment_frequency,
    true
  );

  const deploymentFrequencyToCountCurrentTrends = Object.fromEntries(
    deploymentFrequencyCurrentTrends.map((dateCountTuple) => [
      dateCountTuple[0],
      { count: dateCountTuple[1] }
    ])
  );
  const deploymentFrequencyToCountPreviousTrends = Object.fromEntries(
    deploymentFrequencyPreviousTrends.map((dateCountTuple) => [
      dateCountTuple[0],
      { count: dateCountTuple[1] }
    ])
  );

  return {
    ...deploymentFrequencyToCountPreviousTrends,
    ...deploymentFrequencyToCountCurrentTrends
  };
}
function calculateChangeFailureRateTrends() {
  const currentCfrStats = change_failure_rate_stats.current;
  const previousCfrStats = change_failure_rate_stats.previous;
  const cfrFailedDeploymentTrends = computeTrendsArrayForAverages(
    previousCfrStats.failed_deployments,
    currentCfrStats.failed_deployments
  );
  const cfrTotalDeploymentTrends = computeTrendsArrayForAverages(
    previousCfrStats.total_deployments,
    currentCfrStats.total_deployments
  );

  const cfrCurrentTrends = cfrFailedDeploymentTrends.current.map(
    (dateAndFailedDeploymentsTuple, index) => [
      dateAndFailedDeploymentsTuple[0],
      {
        percentage: percentWithDecimals(
          cfrFailedDeploymentTrends.current[index][1],
          cfrTotalDeploymentTrends.current[index][1]
        ),
        failed_deployments: cfrFailedDeploymentTrends.current[index][1],
        total_deployments: cfrTotalDeploymentTrends.current[index][1]
      }
    ]
  );

  const cfrPreviousTrends = cfrFailedDeploymentTrends.previous.map(
    (dateAndFailedDeploymentsTuple, index) => [
      dateAndFailedDeploymentsTuple[0],
      {
        percentage: percentWithDecimals(
          cfrFailedDeploymentTrends.previous[index][1],
          cfrTotalDeploymentTrends.previous[index][1]
        ),
        failed_deployments: cfrFailedDeploymentTrends.previous[index][1],
        total_deployments: cfrTotalDeploymentTrends.previous[index][1]
      }
    ]
  );

  return {
    ...Object.fromEntries(cfrPreviousTrends),
    ...Object.fromEntries(cfrCurrentTrends)
  };
}
function calculateMeanTimeToRestoreTrends() {
  const currentMtrStats = mean_time_to_restore_stats.current;
  const previousMtrStats = mean_time_to_restore_stats.previous;
  const { current: mtrCurrentTrends, previous: mtrPreviousTrends } =
    computeTrendsArrayForAverages(
      previousMtrStats.time_to_restore_average,
      currentMtrStats.time_to_restore_average
    );

  return {
    ...Object.fromEntries(mtrPreviousTrends),
    ...Object.fromEntries(mtrCurrentTrends)
  };
}

function calculateAverage<T extends Record<string, any>>(
  dataArray: T[],
  key: string
) {
  const total = dataArray.reduce((acc: number, item) => acc + item[key], 0);
  return total / dataArray.length;
}
function calculateSum<T extends Record<string, any>>(
  dataArray: T[],
  key: string
) {
  return dataArray.reduce((acc, item) => acc + item[key], 0);
}

// Helper function to calculate breakdown averages
function calculateBreakdownAverages<T extends Record<string, any>>(
  dataArray: T[],
  breakdownKey: keyof T['breakdown']
) {
  const breakdownDataArray = dataArray.map(
    (item) => item.breakdown[breakdownKey]
  );
  const current_average = calculateAverage(
    breakdownDataArray,
    'current_average'
  );
  const previous_average = calculateAverage(
    breakdownDataArray,
    'previous_average'
  );
  return { current_average, previous_average };
}

function computeTrendsArrayForAverages(
  previousAverage: number,
  currentAverage: number,
  isPositiveCorrelation?: boolean
) {
  const centerValue = (currentAverage + previousAverage) / 2;

  const prevIntervalParams = {
    min: isPositiveCorrelation ? previousAverage * 0.75 : centerValue,
    max: isPositiveCorrelation ? centerValue : previousAverage * 1.25
  };
  const currentIntervalParams = {
    min: isPositiveCorrelation ? centerValue : currentAverage * 0.75,
    max: isPositiveCorrelation ? currentAverage * 1.25 : centerValue
  };

  const trendsArrayForPreviousAverage =
    generateRandomNumbersWithExactAverageAndRange(
      prevIntervalParams.min,
      prevIntervalParams.max,
      previousAverage,
      datesMap.previous.length,
      !isPositiveCorrelation
    );

  const trendsArrayForCurrentAverage =
    generateRandomNumbersWithExactAverageAndRange(
      currentIntervalParams.min,
      currentIntervalParams.max,
      currentAverage,
      datesMap.current.length,
      !isPositiveCorrelation
    );

  return {
    current: createTuplesArray(datesMap.current, trendsArrayForCurrentAverage),
    previous: createTuplesArray(
      datesMap.previous,
      trendsArrayForPreviousAverage
    )
  };
}

function createTuplesArray(
  keyArray: string[],
  dataArray: number[]
): [string, number][] {
  return keyArray.map((key, index) => [key, dataArray[index]]);
}
