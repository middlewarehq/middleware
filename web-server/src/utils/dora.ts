import {
  secondsInHour,
  secondsInDay,
  secondsInMonth,
  secondsInWeek
} from 'date-fns/constants';
import { isNil, mean, reject } from 'ramda';

export enum IndustryStandardsDoraScores {
  ALL_INDUSTRIES = 6.3,
  EDUCATION = 6.5,
  ENERGY = 6.1,
  FINANCIAL_SERVICES = 6.5,
  GOVERNMENT = 6.2,
  HEALTHCARE_AND_PHARMACEUTICALS = 6.0,
  INDUSTRIALS_AND_MANUFACTURING = 5.7,
  INSURANCE = 6.2,
  MEDIA_AND_ENTERTAINMENT = 7.2,
  NON_PROFIT = 6.2,
  RETAIL_CONSUMER_ECOMMERCE = 6.5,
  TECHNOLOGY = 6.3,
  TELECOMMUNICATIONS = 6.2,
  OTHER = 6.7
}

export const getDoraScore = ({
  lt,
  df,
  cfr,
  mttr
}: Partial<Record<'lt' | 'df' | 'cfr' | 'mttr', number>>) => {
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

  const filteredScores = reject(isNil, scores) as Partial<typeof scores>;

  const rawAvg = mean(Object.values(filteredScores));
  const avg = rawAvg ? Number(rawAvg.toFixed(1)) : null;

  return {
    ...filteredScores,
    avg,
    standard: 6.3
  };
};
