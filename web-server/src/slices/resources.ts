import { createSlice } from '@reduxjs/toolkit';
import { mapObjIndexed } from 'ramda';

import { Row } from '@/constants/db';
import { Team } from '@/types/api/teams';
import { StateFetchConfig } from '@/types/redux';
import { BaseUser } from '@/types/resources';
import { getBaseUserFromRowUser } from '@/utils/user';

import type { PayloadAction } from '@reduxjs/toolkit';

type State = StateFetchConfig<{
  users: Record<ID, BaseUser>;
  teams: Record<ID, Team>;
}>;

const initialState: State = {
  users: {},
  teams: {}
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
    updateUsers(
      state: State,
      action: PayloadAction<State['users'] | Record<ID, Row<'Users'>>>
    ): void {
      state.users = {
        ...state.users,
        ...(mapObjIndexed(
          (user: State['users'] | Record<ID, Row<'Users'>>) =>
            user.primary_email
              ? getBaseUserFromRowUser(user as Row<'Users'>)
              : user,
          action.payload as any
        ) as State['users'])
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
    },
    setErrors(state: State, action: PayloadAction<Record<'users', any>>): void {
      state.errors = action.payload;
    }
  },
  extraReducers: (_builder) => {}
});
