import {
  KeyboardArrowDownRounded,
  AdjustRounded,
  GroupWorkRounded,
  WorkspacesOutlined,
  TerminalOutlined
} from '@mui/icons-material';
import { Box } from '@mui/material';
import { useRouter } from 'next/router';
import { FC, useRef } from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useBoolState } from '@/hooks/useEasyState';
import { useSingleTeamConfig } from '@/hooks/useStateTeamConfig';

import { DatePopover } from './DatePopover';
import { TeamPopover } from './TeamPopover';
import { useTeamSelectorSetup } from './useTeamSelectorSetup';

import { FlexBox } from '../FlexBox';
import { HeaderBtn } from '../HeaderBtn';
import { LightTooltip } from '../Shared';

export type TeamSelectorModes =
  | 'single'
  | 'multiple'
  | 'date-only'
  | 'single-only'
  | 'multiple-only';

export const TeamSelector: FC<{
  mode?: TeamSelectorModes;
  closeOnSelect?: boolean;
}> = ({ mode = 'single', closeOnSelect = false }) => {
  const teamElRef = useRef(null);
  const dateElRef = useRef(null);
  const teamsPop = useBoolState(false);
  const datesPop = useBoolState(false);
  const { org } = useAuth();
  const {
    teams,
    apiTeams,
    dateRangeLabel,
    teamsLabel,
    usersMap,
    hideDateSelector,
    hideTeamSelector,
    loadingTeams,
    setRange,
    setShowAllTeams,
    dateRange,
    isSingleMode,
    showAllTeams,
    setProdBranchNamesByTeamId
  } = useTeamSelectorSetup({ mode });

  const { team } = useSingleTeamConfig();

  const router = useRouter();
  const hideTeamMemberFilter = true;

  if (!org) return null;

  return (
    <>
      <Box display="flex" gap={1} alignItems="center">
        {!hideTeamSelector && (
          <HeaderBtn
            ref={teamElRef}
            startIcon={
              <FlexBox alignCenter gap={1 / 4}>
                <LightTooltip
                  title={
                    !isSingleMode
                      ? 'You may select more than one teams'
                      : 'You can select only one team at a time'
                  }
                >
                  {!isSingleMode ? (
                    <GroupWorkRounded sx={{ fontSize: '18px' }} />
                  ) : (
                    <AdjustRounded sx={{ fontSize: '18px' }} />
                  )}
                </LightTooltip>
                {!hideTeamMemberFilter && (
                  <LightTooltip
                    title={
                      team?.member_filter_enabled
                        ? 'Data shown only for team members contributions'
                        : 'Data shown for all contributions to team repos'
                    }
                  >
                    {team?.member_filter_enabled ? (
                      <WorkspacesOutlined sx={{ fontSize: '18px' }} />
                    ) : (
                      <TerminalOutlined sx={{ fontSize: '18px' }} />
                    )}
                  </LightTooltip>
                )}
              </FlexBox>
            }
            endIcon={<KeyboardArrowDownRounded />}
            onClick={teamsPop.true}
            sx={{
              minWidth: '220px',
              '> .MuiButton-endIcon': { marginLeft: 'auto' }
            }}
          >
            {teamsLabel}
          </HeaderBtn>
        )}
        {!hideDateSelector && (
          <HeaderBtn
            ref={dateElRef}
            endIcon={<KeyboardArrowDownRounded />}
            onClick={datesPop.true}
            sx={{ minWidth: '220px', justifyContent: 'space-between' }}
          >
            {dateRangeLabel}
          </HeaderBtn>
        )}
      </Box>
      <TeamPopover
        teamElRef={teamElRef}
        teamsPop={teamsPop}
        setShowAllTeams={setShowAllTeams}
        showAllTeams={showAllTeams}
        apiTeams={apiTeams}
        teams={teams}
        usersMap={usersMap}
        loadingTeams={loadingTeams}
        setProdBranchNamesByTeamId={setProdBranchNamesByTeamId}
        isSingleMode={isSingleMode}
        closeOnSelect={closeOnSelect}
        hideTeamMemberFilter={hideTeamMemberFilter}
      />
      <DatePopover
        dateElRef={dateElRef}
        dateRange={dateRange}
        datesPop={datesPop}
        setRange={setRange}
      />
    </>
  );
};
