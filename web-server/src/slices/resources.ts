import { createSlice } from '@reduxjs/toolkit';

import { Row } from '@/constants/db';
import { Team } from '@/types/api/teams';
import { StateFetchConfig } from '@/types/redux';

import type { PayloadAction } from '@reduxjs/toolkit';

type State = StateFetchConfig<{
  teams: Record<ID, Team>;
  teamReposMaps: Record<ID, (Row<'TeamRepos'> & Row<'OrgRepo'>)[]>;
}>;

const initialState: State = {
  teams: {},
  teamReposMaps: {}
};

export const resourcesSlice = createSlice({
  name: 'resources',
  initialState,
  reducers: {
    updateFetchState(
      state: State,
      action: PayloadAction<Partial<State['requests']>>
    ): void {
      state.requests = {
        ...(action.payload as State['requests'])
      };
    },
    updateTeams(
      state: State,
      action: PayloadAction<State['teams'] | Record<ID, Team>>
    ): void {
      state.teams = {
        ...state.teams,
        ...action.payload
      };
    }
  },
  extraReducers: (_builder) => {}
});
