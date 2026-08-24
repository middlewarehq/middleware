import { debounce } from '@mui/material';
import axios, { CanceledError } from 'axios';
import { useSnackbar } from 'notistack';
import {
  SyntheticEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef
} from 'react';

import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { depFn } from '@/utils/fn';

// CLUSTOX: Jira integration, Phase 2 (project selection). Deliberately its
// own hook, not folded into useTeamsConfig.tsx's repo-selection state --
// Jira projects have none of a repo's deployment-type/workflow concerns,
// and a team's project links save independently of its name/repos (no
// shared "one big form" submit). Mirrors useTeamsConfig.tsx's
// useReposSearch for the live-search half; see
// docs/JIRA_INTEGRATION_PROPOSAL.md.
export type SelectedJiraProject = {
  id: string;
  key: string;
  name: string;
  provider: string;
  idempotency_key: string;
};

const DEBOUNCE_TIME = 500;

const useJiraProjectSearch = () => {
  const { orgId } = useAuth();
  const searchResults = useEasyState<SelectedJiraProject[]>([]);
  const isLoading = useBoolState(false);
  const controllerRef = useRef<AbortController | null>(null);

  const fetchData = useCallback(
    async (query: string) => {
      depFn(isLoading.true);
      if (controllerRef.current) {
        controllerRef.current.abort('Operation canceled due to new request.');
      }
      if (!query) return depFn(isLoading.false);

      controllerRef.current = new AbortController();
      try {
        const response = await axios(
          `/api/internal/${orgId}/jira_project_search`,
          {
            params: { search_text: query },
            signal: controllerRef.current.signal
          }
        );
        depFn(searchResults.set, response.data);
        depFn(isLoading.false);
      } catch (error: any) {
        if (!(error instanceof CanceledError)) {
          depFn(isLoading.false);
          console.error(error);
        }
      }
    },
    [orgId]
  );

  const debouncedSearch = useMemo(
    () => debounce((query: string) => fetchData(query), DEBOUNCE_TIME),
    [fetchData]
  );

  const onSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      debouncedSearch(e.target.value);
    },
    [debouncedSearch]
  );

  return {
    searchResults: searchResults.value,
    onSearchChange,
    isSearching: isLoading.value
  };
};

export const useTeamJiraProjectsConfig = (teamId: ID) => {
  const { enqueueSnackbar } = useSnackbar();
  const selections = useEasyState<SelectedJiraProject[]>([]);
  const isLoading = useBoolState(Boolean(teamId));
  const isSaving = useBoolState(false);
  const { searchResults, onSearchChange, isSearching } = useJiraProjectSearch();

  useEffect(() => {
    if (!teamId) return depFn(isLoading.false);
    depFn(isLoading.true);
    axios(`/api/resources/team_projects`, { params: { team_id: teamId } })
      .then((res) => depFn(selections.set, res.data))
      .catch((error) => console.error(error))
      .finally(isLoading.false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  const projectOptions = useMemo(
    () =>
      searchResults.filter(
        (project) =>
          !selections.value.find((s) => s.idempotency_key === project.idempotency_key)
      ),
    [searchResults, selections.value]
  );

  const handleSelectionChange = useCallback(
    (_: SyntheticEvent, value: SelectedJiraProject[]) => {
      depFn(selections.set, value);
    },
    [selections.set]
  );

  const unselectProject = useCallback(
    (idempotencyKey: string) => {
      depFn(
        selections.set,
        selections.value.filter((p) => p.idempotency_key !== idempotencyKey)
      );
    },
    [selections.set, selections.value]
  );

  const onSave = useCallback(async () => {
    if (!teamId) return;
    depFn(isSaving.true);
    try {
      await axios.put('/api/resources/team_projects', {
        team_id: teamId,
        projects: selections.value.map((p) => ({
          key: p.key,
          name: p.name,
          provider: p.provider,
          idempotency_key: p.idempotency_key
        }))
      });
      enqueueSnackbar('Jira projects updated', {
        variant: 'success',
        autoHideDuration: 2000
      });
    } catch (error) {
      console.error(error);
      enqueueSnackbar('Failed to update Jira projects', {
        variant: 'error',
        autoHideDuration: 2000
      });
    } finally {
      depFn(isSaving.false);
    }
  }, [enqueueSnackbar, isSaving.false, isSaving.true, selections.value, teamId]);

  return {
    selectedProjects: selections.value,
    projectOptions,
    handleSelectionChange,
    unselectProject,
    onSearchChange,
    isSearching,
    isLoading: isLoading.value,
    isSaving: isSaving.value,
    onSave
  };
};
