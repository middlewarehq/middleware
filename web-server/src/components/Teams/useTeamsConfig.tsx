import { createContext, useContext, useEffect, SyntheticEvent } from 'react';
import { useDispatch } from 'react-redux';

import { Integration } from '@/constants/integrations';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { fetchTeams } from '@/slices/team';
import { useSelector } from '@/store';
import { DB_OrgRepo } from '@/types/api/org_repo';
import { Team } from '@/types/api/teams';
import { BaseRepo } from '@/types/resources';

interface TeamsCRUDContextType {
  orgRepos: BaseRepo[];
  teams: Team[];
  teamReposMaps: Record<string, DB_OrgRepo[]>;
  teamName: string;
  showTeamNameError: boolean;
  handleTeamNameChange: (e: any) => void;
  raiseTeamNameError: () => void;
  repoOptions: BaseRepo[];
  selectedRepos: BaseRepo[];
  handleRepoSelectionChange: (
    _: SyntheticEvent<Element, Event>,
    value: BaseRepo[]
  ) => void;
  teamRepoError: boolean;
  raiseTeamRepoError: () => void;
}

const TeamsCRUDContext = createContext<TeamsCRUDContextType | undefined>(
  undefined
);

export const useTeamCRUD = () => {
  const context = useContext(TeamsCRUDContext);
  if (!context) {
    throw new Error(
      'useTeamSettings must be used within a TeamsSettingsProvider'
    );
  }
  return context;
};

export const TeamsCRUDProvider: React.FC = ({ children }) => {
  // general slice data
  const dispatch = useDispatch();
  const teamReposMaps = useSelector((s) => s.team.teamReposMaps);
  const teams = useSelector((s) => s.team.teams);
  const orgRepos = useSelector((s) => s.team.orgRepos);
  const { orgId } = useAuth();

  // team name logic
  const teamName = useEasyState('');
  const teamNameError = useBoolState(false);
  const handleTeamNameChange = (e: any) => {
    teamName.set(e.target.value);
  };
  const showTeamNameError = teamNameError.value;
  const raiseTeamNameError = () => {
    if (!teamName.value) {
      teamNameError.true();
    } else {
      teamNameError.false();
    }
  };

  // team-repo selection logic
  const selections = useEasyState<BaseRepo[]>([]);
  const repoOptions = orgRepos;
  const selectedRepos = selections.value;
  const handleRepoSelectionChange = (
    _: SyntheticEvent<Element, Event>,
    value: BaseRepo[]
  ) => {
    selections.set(value);
  };
  const teamRepoError = useBoolState();
  const raiseTeamRepoError = () => {
    if (!selections.value.length) {
      teamRepoError.true();
    } else {
      teamRepoError.false();
    }
  };

  useEffect(() => {
    dispatch(
      fetchTeams({
        org_id: orgId,
        provider: Integration.GITHUB
      })
    );
  }, [dispatch, orgId]);

  const contextValue: TeamsCRUDContextType = {
    teamName: teamName.value,
    showTeamNameError,
    raiseTeamNameError,
    teamReposMaps,
    teams,
    orgRepos,
    handleTeamNameChange,
    repoOptions,
    selectedRepos,
    handleRepoSelectionChange,
    teamRepoError: teamRepoError.value,
    raiseTeamRepoError
  };

  return (
    <TeamsCRUDContext.Provider value={contextValue}>
      {children}
    </TeamsCRUDContext.Provider>
  );
};
