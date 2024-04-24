import { combineReducers } from '@reduxjs/toolkit';

import { actionsSlice } from '@/slices/actions';
import { appSlice } from '@/slices/app';
import { authSlice } from '@/slices/auth';
import { doraMetricsSlice } from '@/slices/dora_metrics';
import { loadLinkSlice } from '@/slices/loadLink';
import { orgSlice } from '@/slices/org';
import { reposSlice } from '@/slices/repos';
import { teamSlice } from '@/slices/team';

export const rootReducer = combineReducers({
  app: appSlice.reducer,
  auth: authSlice.reducer,
  actions: actionsSlice.reducer,
  team: teamSlice.reducer,
  repos: reposSlice.reducer,
  org: orgSlice.reducer,
  doraMetrics: doraMetricsSlice.reducer,
  loadLink: loadLinkSlice.reducer
});
