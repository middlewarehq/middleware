import { createSlice } from '@reduxjs/toolkit';

interface State {
  sortOrder: 'asc' | 'desc';
  showActionsWithoutTeams: boolean;
}

const initialState: State = {
  sortOrder: 'asc',
  showActionsWithoutTeams: false
};

export const actionsSlice = createSlice({
  name: 'actions',
  initialState,
  reducers: {
    toggleOrder(state: State): void {
      state.sortOrder = state.sortOrder === 'asc' ? 'desc' : 'asc';
    },
    toggleActionsWithoutTeams(state: State): void {
      state.showActionsWithoutTeams = !state.showActionsWithoutTeams;
    }
  }
});
