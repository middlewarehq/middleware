import { combineReducers } from '@reduxjs/toolkit';

import { appSlice } from '../slices/app.js';

export const rootReducer = combineReducers({
  app: appSlice.reducer
});
