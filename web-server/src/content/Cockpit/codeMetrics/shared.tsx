import { DateValueTuple } from '@/types/resources';

export const getTrendsDataFromArray = (trendsArr: DateValueTuple[]) => {
  return trendsArr?.map((t) => t[1]).flat() || [];
};
