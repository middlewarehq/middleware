import { createContext, useContext, useEffect } from 'react';
import { useDispatch } from 'react-redux';

import { Integration } from '@/constants/integrations';
import { useAuth } from '@/hooks/useAuth';
import { fetchTeams } from '@/slices/team';
import { useSelector } from '@/store';
import { DB_OrgRepo } from '@/types/api/org_repo';
import { Team } from '@/types/api/teams';
import { BaseRepo } from '@/types/resources';

interface TeamsCRUDContextType {
  teamName: string;
  orgRepos: BaseRepo[];
  teams: Team[];
  teamReposMaps: Record<string, DB_OrgRepo[]>;
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
  const dispatch = useDispatch();
  const teamReposMaps = useSelector((s) => s.team.teamReposMaps);
  const teams = useSelector((s) => s.team.teams);
  const orgRepos = useSelector((s) => s.team.orgRepos);
  const { orgId } = useAuth();

  useEffect(() => {
    dispatch(
      fetchTeams({
        org_id: orgId,
        provider: Integration.GITHUB
      })
    );
  }, [dispatch, orgId]);

  const contextValue: TeamsCRUDContextType = {
    teamName: '',
    teamReposMaps,
    teams,
    orgRepos
  };

  return (
    <TeamsCRUDContext.Provider value={contextValue}>
      {children}
    </TeamsCRUDContext.Provider>
  );
};
