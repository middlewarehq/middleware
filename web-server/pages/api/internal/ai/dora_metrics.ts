import * as yup from 'yup';
import { Endpoint, nullSchema } from '@/api-helpers/global';
import { handleRequest } from '@/api-helpers/axios';
import {
  DeploymentFrequencyBaseStatsV2,
  TeamDoraMetricsApiResponseType
} from '@/types/resources';

interface DateStringToData<T> {
  [key: string]: T;
}

const postSchema = yup.object().shape({
  data: yup.object().optional(),
  model: yup.string().required(),
  access_token: yup.string().required()
});

const endpoint = new Endpoint(nullSchema);

endpoint.handle.POST(postSchema, async (req, res) => {
  const { data, model, access_token } = req.payload;

  const dora_data = data as unknown as TeamDoraMetricsApiResponseType;

  const [
    dora_metrics_score,
    lead_time_trends_summary,
    change_failure_rate_trends_summary,
    mean_time_to_recovery_trends_summary,
    deployment_frequency_trends_summary,
    dora_trend_summary
  ] = await Promise.all(
    [
      getDoraMetricsScore,
      getLeadTimeSummary,
      getCFRSummary,
      getMTTRSummary,
      getDeploymentFrequencySummary,
      getDoraTrendsCorrelationSummary
    ].map((f) => f(dora_data, model, access_token))
  );

  res.send({
    ...dora_metrics_score,
    ...lead_time_trends_summary,
    ...change_failure_rate_trends_summary,
    ...mean_time_to_recovery_trends_summary,
    ...deployment_frequency_trends_summary,
    ...dora_trend_summary
  });
});

const getDoraMetricsScore = (
  dora_data: TeamDoraMetricsApiResponseType,
  model: string,
  access_token: string
): Promise<{ dora_metrics_score: number }> => {
  const lead_time = dora_data.lead_time_stats.current.lead_time;
  const mean_time_to_recovery =
    dora_data.mean_time_to_restore_stats.current.mean_time_to_recovery;
  const change_failure_rate =
    dora_data.change_failure_rate_stats.current.change_failure_rate;
  const deployment_frequency_data = get_deployment_frequency(
    dora_data.deployment_frequency_stats.current
  );
  const deployment_frequency_key =
    deployment_frequency_data.deployment_frequency_type;
  const avg_deployment_frequency =
    deployment_frequency_data.avg_deployment_frequency;

  const doraData = {
    lead_time,
    mean_time_to_recovery,
    change_failure_rate
  } as any;

  doraData[deployment_frequency_key] = avg_deployment_frequency;

  return handleRequest<{ dora_metrics_score: number }>('ai/dora_score', {
    method: 'POST',
    data: {
      data: doraData,
      model: model,
      access_token: access_token
    }
  });
};

const get_deployment_frequency = (
  data: Partial<DeploymentFrequencyBaseStatsV2>
): {
  avg_deployment_frequency: number;
  deployment_frequency_type:
    | 'avg_daily_deployment_frequency'
    | 'avg_weekly_deployment_frequency'
    | 'avg_monthly_deployment_frequency';
} => {
  const {
    avg_daily_deployment_frequency = 0,
    avg_weekly_deployment_frequency = 0,
    avg_monthly_deployment_frequency = 0
  } = data || {};

  if (avg_daily_deployment_frequency >= 1)
    return {
      avg_deployment_frequency: avg_daily_deployment_frequency,
      deployment_frequency_type: 'avg_daily_deployment_frequency'
    };
  else if (avg_weekly_deployment_frequency >= 1)
    return {
      avg_deployment_frequency: avg_weekly_deployment_frequency,
      deployment_frequency_type: 'avg_weekly_deployment_frequency'
    };
  else
    return {
      avg_deployment_frequency: avg_monthly_deployment_frequency,
      deployment_frequency_type: 'avg_monthly_deployment_frequency'
    };
};

const getLeadTimeSummary = (
  dora_data: TeamDoraMetricsApiResponseType,
  model: string,
  access_token: string
): Promise<{ lead_time_trends_summary: string }> => {
  const leadTimeTrends = transformTrendData(dora_data.lead_time_trends.current);
  return handleRequest<{ lead_time_trends_summary: string }>(
    'ai/lead_time_trends',
    {
      method: 'POST',
      data: {
        data: leadTimeTrends,
        model: model,
        access_token: access_token
      }
    }
  );
};

const getCFRSummary = (
  dora_data: TeamDoraMetricsApiResponseType,
  model: string,
  access_token: string
): Promise<{ change_failure_rate_trends_summary: string }> => {
  const cfrTrends = transformTrendData(
    dora_data.change_failure_rate_trends.current
  );
  return handleRequest<{ change_failure_rate_trends_summary: string }>(
    'ai/change_failure_rate_trends',
    {
      method: 'POST',
      data: {
        data: cfrTrends,
        model: model,
        access_token: access_token
      }
    }
  );
};

const getMTTRSummary = (
  dora_data: TeamDoraMetricsApiResponseType,
  model: string,
  access_token: string
): Promise<{ mean_time_to_recovery_trends_summary: string }> => {
  const mttrTrends = transformTrendData(
    dora_data.mean_time_to_restore_trends.current
  );

  return handleRequest<{ mean_time_to_recovery_trends_summary: string }>(
    'ai/mean_time_to_recovery_trends',
    {
      method: 'POST',
      data: {
        data: mttrTrends,
        model: model,
        access_token: access_token
      }
    }
  );
};

const getDeploymentFrequencySummary = (
  dora_data: TeamDoraMetricsApiResponseType,
  model: string,
  access_token: string
): Promise<{ deployment_frequency_trends_summary: string }> => {
  const deploymentFrequencyTrends = transformTrendData(
    dora_data.deployment_frequency_trends.current
  );

  let transformedDeploymentFrequencyTrends: { [key: string]: number } = {};

  for (let key in deploymentFrequencyTrends) {
    if (deploymentFrequencyTrends.hasOwnProperty(key)) {
      transformedDeploymentFrequencyTrends[key] =
        deploymentFrequencyTrends[key].count;
    }
  }

  return handleRequest<{ deployment_frequency_trends_summary: string }>(
    'ai/deployment_frequency_trends',
    {
      method: 'POST',
      data: {
        data: transformedDeploymentFrequencyTrends,
        model: model,
        access_token: access_token
      }
    }
  );
};

const getDoraTrendsCorrelationSummary = (
  dora_data: TeamDoraMetricsApiResponseType,
  model: string,
  access_token: string
): Promise<{ dora_trend_summary: string }> => {
  const deploymentFrequencyTrends = transformTrendData(
    dora_data.deployment_frequency_trends.current
  );
  const mttrTrends = transformTrendData(
    dora_data.mean_time_to_restore_trends.current
  );
  const cfrTrends = transformTrendData(
    dora_data.change_failure_rate_trends.current
  );
  const leadTimeTrends = transformTrendData(dora_data.lead_time_trends.current);

  let mergedData: any = {};

  for (let key in leadTimeTrends) {
    if (!mergedData[key]) mergedData[key] = {};
    mergedData[key].lead_time = leadTimeTrends[key].lead_time;
  }

  for (let key in mttrTrends) {
    if (!mergedData[key]) mergedData[key] = {};
    mergedData[key].mean_time_to_recovery =
      mttrTrends[key].mean_time_to_recovery;
  }

  for (let key in cfrTrends) {
    if (!mergedData[key]) mergedData[key] = {};
    mergedData[key].change_failure_rate = cfrTrends[key].change_failure_rate;
  }

  for (let key in deploymentFrequencyTrends) {
    if (!mergedData[key]) mergedData[key] = {};
    mergedData[key].deployment_frequency = deploymentFrequencyTrends[key].count;
  }

  console.log(mergedData);

  return handleRequest<{ dora_trend_summary: string }>('ai/dora_trends', {
    method: 'POST',
    data: {
      data: mergedData,
      model: model,
      access_token: access_token
    }
  });
};

const transformTrendData = <T>(
  input: DateStringToData<T>
): DateStringToData<T> => {
  const transformedData: DateStringToData<T> = {};
  for (const datetimeKey in input) {
    if (input.hasOwnProperty(datetimeKey)) {
      const dateKey = datetimeKey.split('T')[0];
      transformedData[dateKey] = input[datetimeKey];
    }
  }
  return transformedData;
};

export default endpoint.serve();
