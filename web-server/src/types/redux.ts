import { FetchState } from '@/constants/ui-states';

export type StateRequests<S = {}> = Partial<
  Record<keyof Omit<S, 'requests' | 'errors'>, FetchState>
>;

export type StateErrors<S> = Partial<Record<keyof StateRequests<S>, any>>;

export type StateFetchConfig<S> = S & {
  requests?: StateRequests<S>;
  errors?: StateErrors<S>;
};
