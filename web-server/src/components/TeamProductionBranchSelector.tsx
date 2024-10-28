import { yupResolver } from '@hookform/resolvers/yup';
import { LoadingButton } from '@mui/lab';
import { Button, Divider, Box } from '@mui/material';
import Link from 'next/link';
import { useSnackbar } from 'notistack';
import { sortBy } from 'ramda';
import { FC, useCallback, useEffect, useMemo } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

import { track } from '@/constants/events';
import { ROUTES } from '@/constants/routes';
import { isRoleLessThanEM } from '@/constants/useRoute';
import { useAuth } from '@/hooks/useAuth';
import { useEasyState } from '@/hooks/useEasyState';
import {
  useSingleTeamConfig,
  useStateBranchConfig
} from '@/hooks/useStateTeamConfig';
import { appSlice } from '@/slices/app';
import { fetchTeamDoraMetrics } from '@/slices/dora_metrics';
import {
  fetchTeamReposProductionBranches,
  updateTeamReposProductionBranches
} from '@/slices/team';
import { useDispatch, useSelector } from '@/store';
import {
  ActiveBranchMode,
  IntegrationGroup,
  TeamRepoBranchDetails
} from '@/types/resources';

import { ChipInput } from './ChipInput';
import { EmptyState } from './EmptyState';
import { FlexBox } from './FlexBox';
import { Line } from './Text';

const teamRepoProductionBranchSchema = yup.object().shape({
  team_id: yup.string().required(),
  org_repo_id: yup.string().required(),
  name: yup.string().required(),
  prod_branches: yup.array().of(yup.string()).optional().nullable(),
  is_active: yup.boolean().required()
});

const productionBranchConfigurationFormSchema = yup.object({
  team_repos: yup
    .array()
    .of(teamRepoProductionBranchSchema.required())
    .required()
});

type ProductionBranchConfigurationFormSchema = yup.InferType<
  typeof productionBranchConfigurationFormSchema
>;

export const TeamProductionBranchSelector: FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const dispatch = useDispatch();
  const { orgId, integrationSet } = useAuth();
  const { singleTeamId, dates } = useSingleTeamConfig();
  const branches = useStateBranchConfig();
  const isCodeIntegrationLinked = integrationSet.has(IntegrationGroup.CODE);
  const isSaving = useEasyState<boolean>(false);
  const { enqueueSnackbar } = useSnackbar();
  const stateTeamReposProductionBranches = useSelector(
    (s) => s.team.teamReposProductionBranches
  );
  const activeBranchMode = useSelector((s) => s.app.branchMode);

  const teamReposProductionBranches = useMemo(
    () =>
      sortBy<TeamRepoBranchDetails>(
        (repo) => repo.name as string,
        stateTeamReposProductionBranches
      ),
    [stateTeamReposProductionBranches]
  );

  const addUserMethods = useForm<ProductionBranchConfigurationFormSchema>({
    resolver: yupResolver(productionBranchConfigurationFormSchema),
    mode: 'onChange'
  });

  const {
    watch,
    formState: { isDirty },
    setValue
  } = addUserMethods;
  const repos = watch('team_repos') as TeamRepoBranchDetails[];

  useEffect(() => {
    if (!singleTeamId) return;
    addUserMethods.reset({
      team_repos: teamReposProductionBranches || []
    });
  }, [addUserMethods, singleTeamId, teamReposProductionBranches]);

  useEffect(() => {
    dispatch(fetchTeamReposProductionBranches({ team_id: singleTeamId }));
  }, [dispatch, singleTeamId]);

  useEffect(() => {
    track('TEAM_PROD_BRANCH_SELECTOR_OPENED');
    return () => track('TEAM_PROD_BRANCH_SELECTOR_CLOSED');
  }, []);

  const updateActiveProdBranch = useCallback(
    (updatedProdBranchesArray: TeamRepoBranchDetails[]) => {
      dispatch(
        appSlice.actions.setBranchState({
          mode: ActiveBranchMode.PROD,
          names:
            updatedProdBranchesArray
              ?.map((r) => r.prod_branches)
              .filter(Boolean)
              .join(',') || ''
        })
      );
    },
    [dispatch]
  );

  const handleSave = useCallback(
    async (e) => {
      const updateConfArgs = {
        team_id: singleTeamId,
        team_repos_data: repos
      };

      track('TEAM_PROD_BRANCH_CONF_SAVE_STARTED', updateConfArgs);
      e.preventDefault();
      isSaving.set(true);

      await dispatch(updateTeamReposProductionBranches(updateConfArgs)).then(
        async (response) => {
          if (response.meta.requestStatus === 'fulfilled') {
            dispatch(
              appSlice.actions.updateTeamProdBranchMap({
                teamId: singleTeamId,
                updatedProdBranchesArray:
                  response.payload as TeamRepoBranchDetails[]
              })
            );
            if (activeBranchMode === ActiveBranchMode.PROD) {
              updateActiveProdBranch(
                response.payload as TeamRepoBranchDetails[]
              );
            }

            const fetchDoraArgs = {
              orgId: orgId,
              teamId: singleTeamId,
              fromDate: dates.start,
              toDate: dates.end,
              branches:
                activeBranchMode === ActiveBranchMode.PROD ? null : branches
            };
            await dispatch(fetchTeamDoraMetrics(fetchDoraArgs));
            enqueueSnackbar('Updated Successfully', {
              variant: 'success',
              autoHideDuration: 3000
            });
            track('TEAM_PROD_BRANCH_CONF_SAVE_SUCCESS', fetchDoraArgs);
          } else {
            enqueueSnackbar('Something went wrong', {
              variant: 'error',
              autoHideDuration: 3000
            });
            track('TEAM_PROD_BRANCH_CONF_SAVE_FAILURE', updateConfArgs);
          }
        }
      );
      isSaving.set(false);
      onClose();
    },
    [
      singleTeamId,
      repos,
      isSaving,
      dispatch,
      onClose,
      activeBranchMode,
      orgId,
      dates.start,
      dates.end,
      branches,
      enqueueSnackbar,
      updateActiveProdBranch
    ]
  );

  if (!isCodeIntegrationLinked || !teamReposProductionBranches.length)
    return <ProdBranchSelectorErrorState />;

  return (
    <FlexBox gap={2} col maxWidth={'500px'}>
      <FlexBox col gap1 component={Line} white small mt={-1}>
        To get the best out of Middleware, tell us what branches get deployed to
        production, and we’ll tell you everything else. 🚀
      </FlexBox>

      <Divider />
      <Box
        fontSize="smaller"
        sx={{ userSelect: 'none' }}
        display="flex"
        flexDirection="column"
        gap={1}
      >
        <Box color="secondary.dark">
          Type comma-separated branch names.{' '}
          <Line bold color="info.dark">
            Regex supported.
          </Line>
        </Box>
        <Box>
          By selecting this, you'll see metrics of these branches for all repos
          associated with this team. If any of the repos don't have any of these
          branches, you'll see no data for those repos.
        </Box>
      </Box>
      <FlexBox alignCenter>
        <Line flexGrow={1} big bold>
          Repo
        </Line>
        <Line big minWidth={'50%'} bold>
          Production Branch
        </Line>
      </FlexBox>
      <FormProvider {...addUserMethods}>
        <FlexBox col gap1>
          {repos?.map((teamRepo, index) => {
            const prodBranches =
              teamRepo.prod_branches
                ?.map((name) => name?.replace(/^\^/, ''))
                ?.map((name) => name?.replace(/\$$/, ''))
                .filter(Boolean) || [];

            return (
              <FlexBox key={index} alignCenter>
                <Line flexGrow={1} big minWidth={'50%'}>
                  {teamRepo.name}
                </Line>
                <ChipInput
                  placeholder="Branch names"
                  values={prodBranches}
                  onChange={(updatedValues: string[]) =>
                    setValue(
                      `team_repos.${index}.prod_branches`,
                      updatedValues,
                      { shouldValidate: true, shouldDirty: true }
                    )
                  }
                />
              </FlexBox>
            );
          })}
        </FlexBox>
        <FlexBox
          sx={{
            justifyContent: 'flex-end'
          }}
        >
          <LoadingButton
            type="submit"
            variant="outlined"
            color="primary"
            disabled={!isDirty}
            loading={isSaving.value}
            sx={{
              '&.Mui-disabled': {
                borderColor: 'secondary.light'
              }
            }}
            onClick={handleSave}
          >
            Save
          </LoadingButton>
        </FlexBox>
      </FormProvider>
    </FlexBox>
  );
};

const ProdBranchSelectorErrorState: FC = () => {
  const { integrationSet, role } = useAuth();
  const isEng = isRoleLessThanEM(role);
  const hasCodeProvider = integrationSet.has(IntegrationGroup.CODE);

  useEffect(() => {
    track('TEAM_PROD_BRANCH_SELECTOR_ERRORED', { hasCodeProvider });
  }, [hasCodeProvider]);

  return (
    <FlexBox>
      {hasCodeProvider ? (
        <EmptyState
          title="Looks like no repos have been assigned to this team"
          desc="Assign repos to this team to start seeing insights. "
          type="NO_REPOS_ASSIGNED"
          noImage
        />
      ) : (
        <EmptyState
          title="Looks like you've not connected a code hosting service"
          desc="Connect with Github or Bitbucket to set production branch for your team"
          type="NO_CODE_PROVIDER"
          noImage
        >
          {isEng ? (
            <Line>Contact a team manager to connect a code provider</Line>
          ) : (
            <>
              <Link passHref href={ROUTES.INTEGRATIONS.PATH}>
                <Button variant="contained" size="small">
                  Connect Code Provider
                </Button>
              </Link>
            </>
          )}
        </EmptyState>
      )}
    </FlexBox>
  );
};
