import { debounce } from '@mui/material';
import axios from 'axios';
import { useSnackbar } from 'notistack';
import { equals } from 'ramda';
import {
  createContext,
  useContext,
  SyntheticEvent,
  useCallback,
  useMemo,
  useEffect
} from 'react';

import { Integration } from '@/constants/integrations';
import { FetchState } from '@/constants/ui-states';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { updateTeamBranchesMap } from '@/slices/app';
import { fetchTeams, createTeam, updateTeam } from '@/slices/team';
import { useDispatch, useSelector } from '@/store';
import { DB_OrgRepo } from '@/types/api/org_repo';
import { Team } from '@/types/api/teams';
import { BaseRepo, RepoUniqueDetails } from '@/types/resources';
import { depFn } from '@/utils/fn';

interface TeamsCRUDContextType {
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
  onDiscard: (callBack?: AnyFunction) => void;
  isEditing: boolean;
  editingTeam: Team | null;
  saveDisabled: boolean;
  loadingRepos: boolean;
  handleReposSearch: (e: React.ChangeEvent<HTMLInputElement>) => void;
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

export const TeamsCRUDProvider: React.FC<{
  teamId?: ID;
}> = ({ children, teamId }) => {
  // team slice logic
  const { enqueueSnackbar } = useSnackbar();
  const dispatch = useDispatch();
  const teamReposMaps = useSelector((s) => s.team.teamReposMaps);
  const teams = useSelector((s) => s.team.teams);
  const { orgId } = useAuth();
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
  const selectedRepos = useMemo(() => selections.value, [selections.value]);
  const teamRepoError = useBoolState();
  const {
    loadingRepos,
    onChange: handleReposSearch,
    searchResults
  } = useReposSearch();
  const repoSearchResult = useMemo(
    () =>
      searchResults.filter(
        (repo) => !selectedRepos.find((r) => r.id === repo.id)
      ),
    [searchResults, selectedRepos]
  );

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

  // editing logic
  const isEditing = Boolean(teamId);
  const editingTeam = useMemo(
    () => teams.find((t) => t.id === teamId) || null,
    [teamId, teams]
  );
  const initState = useMemo(() => {
    if (isEditing) {
      const selectedTeam = editingTeam;
      const selectedTeamRepos =
        teamReposMaps?.[teamId]?.map(adaptBaseRepo) || [];
      return {
        name: selectedTeam?.name || '',
        repos: selectedTeamRepos
      };
    }
    return {
      name: '',
      repos: []
    };
  }, [editingTeam, isEditing, teamId, teamReposMaps]);

  useEffect(() => {
    if (isEditing) {
      depFn(teamName.set, initState.name);
      depFn(selections.set, initState.repos);
    }
  }, [
    initState.name,
    initState.repos,
    isEditing,
    selections.set,
    teamName.set
  ]);

  // save team logic
  const isSaveLoading = useBoolState();
  const teamCreation = useCallback(
    async (callBack?: AnyFunction) => {
      depFn(isSaveLoading.true);
      const repoPayload = repoToPayload(selections.value);

      const capitalizedTeamName =
        teamName.value.charAt(0).toUpperCase() + teamName.value.slice(1);

      return dispatch(
        createTeam({
          org_id: orgId,
          team_name: capitalizedTeamName,
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
      orgId,
      selections.value,
      teamName.value
    ]
  );

  const teamUpdation = useCallback(
    async (callBack?: AnyFunction) => {
      depFn(isSaveLoading.true);
      const repoPayload = repoToPayload(selections.value);

      return dispatch(
        updateTeam({
          team_id: teamId,
          org_id: orgId,
          team_name: teamName.value,
          org_repos: repoPayload,
          provider: Integration.GITHUB
        })
      )
        .then((res) => {
          if (res.meta.requestStatus === 'rejected') {
            enqueueSnackbar('Failed to update team', {
              variant: 'error',
              autoHideDuration: 2000
            });
            return console.error('Failed to update team', res.meta);
          }
          enqueueSnackbar('Team updated successfully, refreshing...', {
            variant: 'success',
            autoHideDuration: 2000
          });
          fetchTeamsAndRepos();
          dispatch(updateTeamBranchesMap({ orgId }));
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
      orgId,
      selections.value,
      teamId,
      teamName.value
    ]
  );

  const onSave = useCallback(
    async (callBack?: AnyFunction) => {
      if (isEditing) {
        return await teamUpdation(callBack);
      }
      return await teamCreation(callBack);
    },
    [isEditing, teamCreation, teamUpdation]
  );

  const resetErrors = useCallback(() => {
    depFn(teamRepoError.false);
    depFn(teamNameError.false);
  }, [teamNameError.false, teamRepoError.false]);

  const onDiscard = useCallback(
    (callBack?: AnyFunction) => {
      resetErrors();
      if (!isEditing) {
        depFn(teamName.set, '');
        depFn(selections.set, []);
        return callBack?.();
      }
      depFn(teamName.set, initState.name);
      depFn(selections.set, initState.repos);
      return callBack?.();
    },
    [
      resetErrors,
      isEditing,
      teamName.set,
      initState.name,
      initState.repos,
      selections.set
    ]
  );

  const saveDisabled = useMemo(() => {
    const baseConditions =
      !teamName.value || !selections.value.length || isSaveLoading.value;
    if (isEditing) {
      return (
        baseConditions ||
        (teamName.value === initState.name &&
          equals(selections.value, initState.repos))
      );
    }
    return baseConditions;
  }, [
    initState.name,
    initState.repos,
    isEditing,
    isSaveLoading.value,
    selections.value,
    teamName.value
  ]);

  const contextValue: TeamsCRUDContextType = {
    teamName: teamName.value,
    showTeamNameError: teamNameError.value,
    raiseTeamNameError,
    teamReposMaps,
    teams,
    handleTeamNameChange,
    repoOptions: repoSearchResult,
    selectedRepos,
    handleRepoSelectionChange,
    teamRepoError: teamRepoError.value,
    raiseTeamRepoError,
    onSave,
    isSaveLoading: isSaveLoading.value,
    unselectRepo,
    isPageLoading,
    onDiscard,
    isEditing,
    editingTeam,
    saveDisabled,
    loadingRepos,
    handleReposSearch
  };

  return (
    <TeamsCRUDContext.Provider value={contextValue}>
      {children}
    </TeamsCRUDContext.Provider>
  );
};

const repoToPayload = (repos: BaseRepo[]) => {
  const repoPayload = {} as Record<string, RepoUniqueDetails[]>;
  repos.forEach((repo) => {
    const orgRepo: RepoUniqueDetails = {
      idempotency_key: String(repo.id),
      name: repo.name,
      slug: repo.slug,
      default_branch: repo.branch
    };
    const orgName = repo.parent;

    if (repoPayload[orgName]) {
      repoPayload[orgName].push(orgRepo);
    } else {
      repoPayload[orgName] = [orgRepo];
    }
  });

  return repoPayload;
};

const DEBOUNCE_TIME = 500;

const useReposSearch = () => {
  const { orgId } = useAuth();
  const searchResults = useEasyState<BaseRepo[]>([]);
  const isLoading = useBoolState(false);

  let cancelTokenSource = axios.CancelToken.source();

  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    depFn(isLoading.true);
    const query = e.target.value;
    if (!query) {
      depFn(isLoading.false);
      return;
    }
    debouncedSearch(query);
  };

  const debouncedSearch = useCallback(
    debounce((query) => {
      fetchData(query);
    }, DEBOUNCE_TIME),
    []
  );

  const fetchData = useCallback(
    async (query) => {
      // cancel the previous request if it exists
      if (cancelTokenSource) {
        cancelTokenSource.cancel('Operation canceled due to new request.');
      }
      // create a new cancel token
      cancelTokenSource = axios.CancelToken.source();

      try {
        const response = await axios(
          `/api/internal/${orgId}/git_provider_org`,
          {
            params: { provider: Integration.GITHUB, search_text: query },
            cancelToken: cancelTokenSource.token
          }
        );
        const data = response.data;
        depFn(searchResults.set, data);
        depFn(isLoading.false);
      } catch (error: any) {
        if (!axios.isCancel(error)) {
          depFn(isLoading.false);
          console.error(error);
        }
      }
    },
    [orgId]
  );

  return {
    searchResults: searchResults.value,
    onChange,
    loadingRepos: isLoading.value
  };
};

const adaptBaseRepo = (repo: DB_OrgRepo): BaseRepo =>
  ({
    id: Number(repo.idempotency_key),
    name: repo.name,
    slug: repo.slug,
    branch: repo.default_branch,
    parent: repo.org_name
  }) as BaseRepo;
