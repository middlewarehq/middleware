// slice for storing all the data from query params, for loading shareable links

import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { QuickRangeOptions } from '@/components/DateRangePicker/utils';
import { Team } from '@/types/api/teams';
import { ActiveBranchMode } from '@/types/resources';

import { SerializableDateRange } from './app';

export type LoadLinkState = {
  linkDateRange?: SerializableDateRange;
  linkDateMode?: QuickRangeOptions;
  linkSingleTeam?: Team[];
  linkMultiTeam?: Team[];
  linkBranch?: ActiveBranchMode;
  linkUserId?: ID;
};

const initialState: LoadLinkState = {
  linkDateRange: ['', ''],
  linkDateMode: null,
  linkSingleTeam: [],
  linkMultiTeam: [],
  linkBranch: null,
  linkUserId: null
};

export const loadLinkSlice = createSlice({
  name: 'loadLink',
  initialState,
  reducers: {
    setLinkDateRange: (
      state: LoadLinkState,
      action: PayloadAction<LoadLinkState['linkDateRange']>
    ) => {
      state.linkDateRange = action.payload;
    },
    setLinkDateMode: (
      state: LoadLinkState,
      action: PayloadAction<LoadLinkState['linkDateMode']>
    ) => {
      state.linkDateMode = action.payload;
    },
    setLinkSingleTeam: (
      state: LoadLinkState,
      action: PayloadAction<LoadLinkState['linkSingleTeam']>
    ) => {
      state.linkSingleTeam = action.payload;
    },
    setLinkMultiTeam: (
      state: LoadLinkState,
      action: PayloadAction<LoadLinkState['linkMultiTeam']>
    ) => {
      state.linkMultiTeam = action.payload;
    },
    setLinkBranch: (
      state: LoadLinkState,
      action: PayloadAction<LoadLinkState['linkBranch']>
    ) => {
      state.linkBranch = action.payload;
    },
    setLinkUserId: (
      state: LoadLinkState,
      action: PayloadAction<LoadLinkState['linkUserId']>
    ) => {
      state.linkUserId = action.payload;
    }
  }
});
