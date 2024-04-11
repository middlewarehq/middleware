import { DateValueTuple, LeadTimePipelineStat } from '@/types/resources';

interface TeamAnalyticsV2 {
  lead_time: number;
  first_commit_to_open: number;
  first_response_time: number;
  rework_time: number;
  merge_time: number;
  merge_to_deploy: number;
  pr_count: number;
  team_id: string;
}

interface ManagerAnalyticsV2 {
  lead_time: number;
  first_commit_to_open: number;
  first_response_time: number;
  rework_time: number;
  merge_time: number;
  merge_to_deploy: number;
  pr_count: number;
  manager_id: string;
  team_ids: string[];
}

interface LeadTimeTrendsV2 {
  [date: string]: {
    lead_time: number;
    first_commit_to_open: number;
    first_response_time: number;
    rework_time: number;
    merge_time: number;
    merge_to_deploy: number;
    pr_count: number;
  };
}

interface LeadTimeResponseV2 {
  lead_time: number;
  first_commit_to_open: number;
  first_response_time: number;
  rework_time: number;
  merge_time: number;
  merge_to_deploy: number;
  pr_count: number;
  team_analytics: TeamAnalyticsV2[];
  manager_analytics: ManagerAnalyticsV2[];
}

interface IntervalLeadTimeTrendsV2 {
  lead_time_trends: LeadTimeTrendsV2;
}

export interface LeadTimeDataV2 {
  currLeadTimeResponse: LeadTimeResponseV2;
  prevLeadTimeResponse: LeadTimeResponseV2;
  currIntervalLeadTimeTrends: IntervalLeadTimeTrendsV2;
  prevIntervalLeadTimeTrends: IntervalLeadTimeTrendsV2;
}

enum BreakDown {
  lead_time = 'lead_time',
  first_commit_to_open = 'first_commit_to_open',
  first_response_time = 'first_response_time',
  rework_time = 'rework_time',
  merge_time = 'merge_time',
  merge_to_deploy = 'merge_to_deploy',
  pr_count = 'pr_count'
}

export const breakDownAdaptorForLeadTimeTrends = (
  leadTimeTrends: IntervalLeadTimeTrendsV2
) => {
  return Object.values(BreakDown)
    .map((metric) => {
      return {
        id: metric,
        data: Object.entries(leadTimeTrends.lead_time_trends).map(
          ([date, value]) => {
            if (value[metric]) return [date, value[metric]] as DateValueTuple;
          }
        )
      };
    })
    .reduce((prev, curr) => {
      return {
        ...prev,
        [curr.id]: curr.data
      };
    }, {}) as Record<BreakDown, DateValueTuple[]>;
};

export const breakDownAdapterForLeadTimeResponse = (
  currLeadTimeResponse: LeadTimeResponseV2,
  prevLeadTimeResponse: LeadTimeResponseV2
) => {
  return {
    first_commit_to_open: {
      current_average: currLeadTimeResponse.first_commit_to_open,
      previous_average: prevLeadTimeResponse.first_commit_to_open
    },
    first_response_time: {
      current_average: currLeadTimeResponse.first_response_time,
      previous_average: prevLeadTimeResponse.first_response_time
    },
    merge_time: {
      current_average: currLeadTimeResponse.merge_time,
      previous_average: prevLeadTimeResponse.merge_time
    },
    merge_to_deploy: {
      current_average: currLeadTimeResponse.merge_to_deploy,
      previous_average: prevLeadTimeResponse.merge_to_deploy
    },
    rework_time: {
      current_average: currLeadTimeResponse.rework_time,
      previous_average: prevLeadTimeResponse.rework_time
    }
  };
};

export const managerAnalyticAdapter = (
  currLeadTimeResponse: LeadTimeResponseV2,
  prevLeadTimeResponse: LeadTimeResponseV2
) => {
  return currLeadTimeResponse.manager_analytics
    .map((managerItem) => {
      const prev = prevLeadTimeResponse.manager_analytics.find(
        (prevItem) => prevItem.manager_id === managerItem.manager_id
      );
      if (!prev) {
        return null;
      }
      return {
        manager_id: managerItem.manager_id,
        current_average: managerItem.lead_time,
        previous_average: prev.lead_time,
        team_ids: managerItem.team_ids,
        breakdown: {
          first_commit_to_open: {
            current_average: managerItem.first_commit_to_open,
            previous_average: prev.first_commit_to_open
          },
          first_response_time: {
            current_average: managerItem.first_response_time,
            previous_average: prev.first_response_time
          },
          merge_time: {
            current_average: managerItem.merge_time,
            previous_average: prev.merge_time
          },
          merge_to_deploy: {
            current_average: managerItem.merge_to_deploy,
            previous_average: prev.merge_to_deploy
          },
          rework_time: {
            current_average: managerItem.rework_time,
            previous_average: prev.rework_time
          }
        }
      };
    })
    .filter(Boolean);
};

export const teamAnalyticAdapter = (
  currLeadTimeResponse: LeadTimeResponseV2,
  prevLeadTimeResponse: LeadTimeResponseV2
) => {
  return currLeadTimeResponse.team_analytics.map((currItem) => {
    const prevItem = prevLeadTimeResponse.team_analytics.find(
      (prevItem) => prevItem.team_id === currItem.team_id
    );
    return {
      team_id: currItem.team_id,
      breakdown: {
        first_commit_to_open: {
          current_average: currItem.first_commit_to_open,
          previous_average: prevItem.first_commit_to_open
        },
        first_response_time: {
          current_average: currItem.first_response_time,
          previous_average: prevItem.first_response_time
        },
        merge_time: {
          current_average: currItem.merge_time,
          previous_average: prevItem.merge_time
        },
        merge_to_deploy: {
          current_average: currItem.merge_to_deploy,
          previous_average: prevItem.merge_to_deploy
        },
        rework_time: {
          current_average: currItem.rework_time,
          previous_average: prevItem.rework_time
        }
      },
      current_average: currItem.lead_time,
      current_pr_count: currItem.pr_count,
      previous_average: prevItem.lead_time,
      previous_pr_count: prevItem.pr_count
    };
  });
};

export const leadTimeTrendArrayAdapter = (
  currLeadTimeTrends: IntervalLeadTimeTrendsV2
) => {
  return Object.entries(currLeadTimeTrends.lead_time_trends)
    .filter(Boolean)
    .map(([date, value]) => {
      return [date, value.lead_time] as DateValueTuple;
    });
};

export const adaptP90 = (input: LeadTimeResponseV2): LeadTimePipelineStat => {
  return {
    first_commit_to_pr_time: input.first_commit_to_open,
    first_response_time: input.first_response_time,
    rework_time: input.rework_time,
    merge_time: input.merge_time,
    pr_to_deploy_time: input.merge_to_deploy
  };
};
