import {
  AsyncThunk,
  ActionReducerMapBuilder,
  Draft,
  PayloadAction
} from '@reduxjs/toolkit';

import { FetchState } from '@/constants/ui-states';
import { StateFetchConfig } from '@/types/redux';

export const addFetchCasesToReducer = <
  S extends StateFetchConfig<{}>,
  T extends AsyncThunk<any, any, any>
>(
  builder: ActionReducerMapBuilder<S>,
  thunk: T,
  key: keyof S['requests'],
  onSuccess?: (
    state: Draft<S>,
    action: PayloadAction<ReturnType<T['fulfilled']>['payload']>
  ) => any,
  onFailure?: (state: Draft<S>, action: PayloadAction<any>) => any
) => {
  builder.addCase(thunk.fulfilled, (state, action) => {
    if (!state.requests) state.requests = {};

    onSuccess?.(state, action);
    // @ts-ignore
    state.requests[key] = FetchState.SUCCESS;
  });

  builder.addCase(thunk.pending, (state) => {
    if (!state.requests) state.requests = {};
    // @ts-ignore
    state.requests[key] = FetchState.REQUEST;
  });

  builder.addCase(thunk.rejected, (state, action) => {
    if (!state.requests) state.requests = {};
    if (!state.errors) state.errors = {};
    // @ts-ignore
    state.requests[key as string] = FetchState.FAILURE;
    // @ts-ignore
    state.errors[key as string] = action.error as string;
    onFailure?.(state, action);
  });
};
