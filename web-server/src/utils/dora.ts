import {
  secondsInHour,
  secondsInDay,
  secondsInMonth,
  secondsInWeek
} from 'date-fns/constants';
import { isNil, mean, reject } from 'ramda';

export enum Industries {
  ALL_INDUSTRIES = 'All Industries',
  EDUCATION = 'Education',
  ENERGY = 'Energy',
  FINANCIAL_SERVICES = 'Financial Services',
  GOVERNMENT = 'Government',
  HEALTHCARE_AND_PHARMACEUTICALS = 'Healthcare & Pharmaceuticals',
  INDUSTRIALS_AND_MANUFACTURING = 'Industrials & Manufacturing',
  INSURANCE = 'Insurance',
  MEDIA_AND_ENTERTAINMENT = 'Media/Entertainment',
  NON_PROFIT = 'Non-profit',
  RETAIL_CONSUMER_ECOMMERCE = 'Retail/Consumer/e-Commerce',
  TECHNOLOGY = 'Technology',
  TELECOMMUNICATIONS = 'Telecommunications',
  OTHER = 'Other'
}

export const IndustryStandardsDoraScores: Record<Industries, number> = {
  [Industries.ALL_INDUSTRIES]: 6.3,
  [Industries.EDUCATION]: 6.5,
  [Industries.ENERGY]: 6.1,
  [Industries.FINANCIAL_SERVICES]: 6.5,
  [Industries.GOVERNMENT]: 6.2,
  [Industries.HEALTHCARE_AND_PHARMACEUTICALS]: 6.0,
  [Industries.INDUSTRIALS_AND_MANUFACTURING]: 5.7,
  [Industries.INSURANCE]: 6.2,
  [Industries.MEDIA_AND_ENTERTAINMENT]: 7.2,
  [Industries.NON_PROFIT]: 6.2,
  [Industries.RETAIL_CONSUMER_ECOMMERCE]: 6.5,
  [Industries.TECHNOLOGY]: 6.3,
  [Industries.TELECOMMUNICATIONS]: 6.2,
  [Industries.OTHER]: 6.7
};

/**
 * Calculates the DORA (DevOps Research and Assessment) score based on the provided parameters.
 *
 * @param {Object} params - An object containing the following properties:
 * @param {number | null} [params.lt] - Lead Time for Changes
 * @param {number | null} [params.df] - Weekly Deployment Frequency. IMPORTANT: must be weekly
 * @param {number | null} [params.cfr] - Change Failure Rate
 * @param {number | null} [params.mttr] - Mean Time to Recovery.
 */
export const getDoraScore = ({
  lt,
  df,
  cfr,
  mttr
}: Partial<Record<'lt' | 'df' | 'cfr' | 'mttr', number | null>>) => {
  const ltMttrBreakpoints = [
    secondsInMonth * 6,
    secondsInMonth,
    secondsInWeek,
    secondsInDay,
    secondsInHour,
    0
  ];

  const deployBreakpoints = [
    1 / (4 * 6), // ~once in 6 months
    1 / 4, // once in 4 weeks (~monthly)
    1, // weekly
    7, // daily
    7 * 2, // frequent
    Infinity // on demand
  ];

  const getScoreFromData = (data: number, breakpoints: number[]) =>
    breakpoints.findIndex((pt) => data >= pt) * 2;

  const getScoreFromDataInv = (data: number, breakpoints: number[]) =>
    breakpoints.findIndex((pt) => data <= pt) * 2;

  const getCFRScore = (cfr: number) => Number(((100 - cfr) / 10).toFixed(1));

  const scores = {
    lt: typeof lt === 'number' ? getScoreFromData(lt, ltMttrBreakpoints) : null,
    df:
      typeof df === 'number'
        ? getScoreFromDataInv(df, deployBreakpoints)
        : null,
    cfr: typeof cfr === 'number' ? getCFRScore(cfr) : null,
    mttr:
      typeof mttr === 'number'
        ? getScoreFromData(mttr, ltMttrBreakpoints)
        : null
  };

  const filteredScores = reject(isNil, scores) as Record<
    keyof typeof scores,
    number
  >;

  const rawAvg = mean(Object.values(filteredScores));
  const avg = rawAvg ? Number(rawAvg.toFixed(1)) : null;

  return {
    ...filteredScores,
    avg,
    standard: 6.3
  };
};
