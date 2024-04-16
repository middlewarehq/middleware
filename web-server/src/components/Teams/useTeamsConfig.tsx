import { useSnackbar } from 'notistack';
import {
  createContext,
  useContext,
  useEffect,
  SyntheticEvent,
  useCallback
} from 'react';

import { Integration } from '@/constants/integrations';
import { FetchState } from '@/constants/ui-states';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { fetchTeams, createTeam } from '@/slices/team';
import { useDispatch, useSelector } from '@/store';
import { DB_OrgRepo } from '@/types/api/org_repo';
import { Team } from '@/types/api/teams';
import { BaseRepo, RepoUniqueDetails } from '@/types/resources';
import { depFn } from '@/utils/fn';

interface TeamsCRUDContextType {
  orgRepos: BaseRepo[];
  teams: Team[];
  teamReposMaps: Record<string, DB_OrgRepo[]>;
  teamName: string;
  showTeamNameError: boolean;
  handleTeamNameChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  raiseTeamNameError: () => void;
  repoOptions: BaseRepo[];
  selectedRepos: BaseRepo[];
  handleRepoSelectionChange: (
    _: SyntheticEvent<Element, Event>,
    value: BaseRepo[]
  ) => void;
  teamRepoError: boolean;
  raiseTeamRepoError: () => void;
  onSave: (callBack?: AnyFunction) => void;
  isSaveLoading: boolean;
  unselectRepo: (id: BaseRepo['id']) => void;
  isPageLoading: boolean;
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
  // team slice logic
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const teamReposMaps = useSelector((s) => s.team.teamReposMaps);
  const teams = useSelector((s) => s.team.teams);
  const orgRepos = useSelector((s) => s.team.orgRepos);
  const { orgId, org } = useAuth();
  const isPageLoading = useSelector(
    (s) => s.team.requests?.teams === FetchState.REQUEST
  );
  const fetchTeamsAndRepos = useCallback(() => {
    return dispatch(
      fetchTeams({
        org_id: orgId,
        provider: Integration.GITHUB
      })
    );
  }, [dispatch, orgId]);

  useEffect(() => {
    fetchTeamsAndRepos();
  }, [dispatch, fetchTeamsAndRepos, orgId]);

  // team name logic
  const teamName = useEasyState('');
  const teamNameError = useBoolState(false);
  const raiseTeamNameError = useCallback(() => {
    if (!teamName.value) {
      depFn(teamNameError.true);
    } else {
      depFn(teamNameError.false);
    }
  }, [teamName.value, teamNameError.false, teamNameError.true]);

  const handleTeamNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      depFn(teamName.set, e.target.value);
      depFn(raiseTeamNameError);
    },
    [raiseTeamNameError, teamName.set]
  );

  // team-repo selection logic
  const selections = useEasyState<BaseRepo[]>([]);
  const repoOptions = orgRepos;
  const selectedRepos = selections.value;
  const teamRepoError = useBoolState();
  const raiseTeamRepoError = useCallback(() => {
    if (!selections.value.length) {
      depFn(teamRepoError.true);
    } else {
      depFn(teamRepoError.false);
    }
  }, [selections.value.length, teamRepoError.false, teamRepoError.true]);
  const handleRepoSelectionChange = useCallback(
    (_: SyntheticEvent<Element, Event>, value: BaseRepo[]) => {
      depFn(selections.set, value);
      depFn(teamRepoError.false);
    },
    [selections.set, teamRepoError.false]
  );
  const unselectRepo = useCallback(
    (id: BaseRepo['id']) => {
      if (selections.value.length === 1) {
        depFn(teamRepoError.true);
      }
      depFn(
        selections.set,
        selections.value.filter((r) => r.id !== id)
      );
    },
    [selections.set, selections.value, teamRepoError.true]
  );

  // save team logic
  const isSaveLoading = useBoolState();
  const onSave = useCallback(
    (callBack?: AnyFunction) => {
      depFn(isSaveLoading.true);
      const repoPayload = {
        [org.name]: selections.value.map(
          (repo) =>
            ({
              idempotency_key: repo.id,
              name: repo.name,
              slug: repo.slug
            }) as RepoUniqueDetails
        )
      };
      dispatch(
        createTeam({
          org_id: orgId,
          team_name: teamName.value,
          org_repos: repoPayload,
          provider: Integration.GITHUB
        })
      )
        .then((res) => {
          if (res.meta.requestStatus === 'rejected') {
            enqueueSnackbar('Failed to create team', {
              variant: 'error',
              autoHideDuration: 2000
            });
            return console.error('Failed to create team', res.meta);
          }
          enqueueSnackbar('Team created successfully, refreshing...', {
            variant: 'success',
            autoHideDuration: 2000
          });
          fetchTeamsAndRepos();
          callBack?.(res);
        })
        .finally(isSaveLoading.false);
    },
    [
      dispatch,
      enqueueSnackbar,
      fetchTeamsAndRepos,
      isSaveLoading.false,
      isSaveLoading.true,
      org.name,
      orgId,
      selections.value,
      teamName.value
    ]
  );

  const contextValue: TeamsCRUDContextType = {
    teamName: teamName.value,
    showTeamNameError: teamNameError.value,
    raiseTeamNameError,
    teamReposMaps,
    teams,
    orgRepos,
    handleTeamNameChange,
    repoOptions,
    selectedRepos,
    handleRepoSelectionChange,
    teamRepoError: teamRepoError.value,
    raiseTeamRepoError,
    onSave,
    isSaveLoading: isSaveLoading.value,
    unselectRepo,
    isPageLoading
  };

  return (
    <TeamsCRUDContext.Provider value={contextValue}>
      {children}
    </TeamsCRUDContext.Provider>
  );
};
