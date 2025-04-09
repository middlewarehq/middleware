import { yupResolver } from '@hookform/resolvers/yup';
import { HelpOutlineRounded } from '@mui/icons-material';
import { LoadingButton } from '@mui/lab';
import { Divider, Select, MenuItem } from '@mui/material';
import { useSnackbar } from 'notistack';
import { FC } from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import * as yup from 'yup';

import { useAuth } from '@/hooks/useAuth';
import { useEasyState } from '@/hooks/useEasyState';
import {
  useSingleTeamConfig,
  useStateBranchConfig
} from '@/hooks/useStateTeamConfig';
import { fetchTeamDoraMetrics } from '@/slices/dora_metrics';
import { updateTeamIncidentPRsFilter } from '@/slices/team';
import { useDispatch, useSelector } from '@/store';
import { ActiveBranchMode, IncidentPRMappingOptions } from '@/types/resources';

import { ChipInput } from './ChipInput';
import { FlexBox } from './FlexBox';
import { IOSSwitch } from './Shared';
import { Line } from './Text';

const incidentPRFilterFormSchema = yup
  .object({
    setting: yup
      .object({
        include_revert_prs: yup.boolean(),
        title_filters: yup.array().of(yup.string()).required(),
        head_branch_filters: yup.array().of(yup.string()).required(),
        pr_mapping_field: yup.string(),
        pr_mapping_pattern: yup.string().when('pr_mapping_field', {
          is: (pr_mapping_field: string) => pr_mapping_field !== '',
          then: yup.string().required()
        })
      })
      .required()
  })
  .required();

type incidentPRFilterFormSchema = yup.InferType<
  typeof incidentPRFilterFormSchema
>;

export const TeamIncidentPRsFilter: FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const dispatch = useDispatch();
  const { orgId } = useAuth();
  const { singleTeamId, dates } = useSingleTeamConfig();
  const branches = useStateBranchConfig();
  const isSaving = useEasyState<boolean>(false);
  const { enqueueSnackbar } = useSnackbar();
  const activeBranchMode = useSelector((s) => s.app.branchMode);
  const teamIncidentPRsFilters = useSelector(
    (s) => s.team.teamIncidentPRsFilters
  )?.setting;

  const addUserMethods = useForm<incidentPRFilterFormSchema>({
    resolver: yupResolver(incidentPRFilterFormSchema),
    mode: 'onChange',
    defaultValues: {
      setting: teamIncidentPRsFilters
    }
  });

  const {
    watch,
    formState: { isDirty, isValid },
    setValue
  } = addUserMethods;

  const settings = watch('setting');

  const handleSave = async (e: any) => {
    const updateConfArgs = {
      team_id: singleTeamId,
      setting: settings
    };

    e.preventDefault();
    isSaving.set(true);

    await dispatch(updateTeamIncidentPRsFilter(updateConfArgs)).then(
      async (response) => {
        if (response.meta.requestStatus === 'fulfilled') {
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
        } else {
          enqueueSnackbar('Something went wrong', {
            variant: 'error',
            autoHideDuration: 3000
          });
        }
      }
    );

    isSaving.set(false);
    onClose();
  };

  return (
    <FlexBox gap={2} col width={'500px'}>
      <FlexBox col gap1 component={Line} white small mt={-1} alignStart>
        Define filters to include only PRs that are relevant to Incidents for
        better tracking and insights. 🚀
      </FlexBox>

      <Divider />
      <FlexBox alignCenter>
        <Line minWidth={'45%'} big bold>
          Field
        </Line>
        <Line big bold>
          Filters (case sensitive)
        </Line>
      </FlexBox>
      <FormProvider {...addUserMethods}>
        <FlexBox col gap2>
          <FlexBox alignCenter>
            <Line flexGrow={1} big minWidth={'45%'}>
              Include Reverted PRs
            </Line>
            <IOSSwitch
              checked={settings.include_revert_prs}
              value={String(settings.include_revert_prs)}
              onChange={(e) => {
                const isEnabled = e.target.value === 'true' ? true : false;
                setValue(`setting.include_revert_prs`, !isEnabled, {
                  shouldValidate: true,
                  shouldDirty: true
                });
              }}
            ></IOSSwitch>
          </FlexBox>
          <FlexBox alignCenter>
            <Line big minWidth={'45%'}>
              Head Branch Includes
            </Line>
            <ChipInput
              key="head_branch_filters"
              placeholder="PR Head Branch"
              values={settings.head_branch_filters}
              onChange={(updatedValues: string[]) =>
                setValue(`setting.head_branch_filters`, updatedValues, {
                  shouldValidate: true,
                  shouldDirty: true
                })
              }
            />
          </FlexBox>
          <FlexBox alignCenter>
            <Line big minWidth={'45%'}>
              Title Includes
            </Line>
            <ChipInput
              key="title_filters"
              placeholder="PR Title"
              values={settings.title_filters}
              onChange={(updatedValues: string[]) =>
                setValue(`setting.title_filters`, updatedValues, {
                  shouldValidate: true,
                  shouldDirty: true
                })
              }
            />
          </FlexBox>
          <FlexBox alignCenter>
            <FlexBox minWidth={'45%'} alignCenter>
              <Line big py={1}>
                PR Mapping
              </Line>
              <FlexBox
                color="white"
                title={
                  <Line tiny medium white>
                    Helps to link Resolution PRs to their corresponding Incident
                    PRs
                  </Line>
                }
                darkTip
              >
                <HelpOutlineRounded sx={{ fontSize: '1.4em' }} />
              </FlexBox>
            </FlexBox>
            <Select
              value={settings.pr_mapping_field || 'none'}
              onChange={(e) => {
                const updatedValue =
                  e.target.value === 'none' ? '' : e.target.value;
                setValue(`setting.pr_mapping_pattern`, '', {
                  shouldValidate: true,
                  shouldDirty: true
                });
                setValue(`setting.pr_mapping_field`, updatedValue, {
                  shouldValidate: true,
                  shouldDirty: true
                });
              }}
              size="small"
            >
              <MenuItem value="none">None</MenuItem>
              <MenuItem value="title">Title</MenuItem>
              <MenuItem value="head_branch">Head Branch</MenuItem>
            </Select>
            {settings.pr_mapping_field && (
              <Select
                value={settings.pr_mapping_pattern}
                onChange={(e) => {
                  setValue(`setting.pr_mapping_pattern`, e.target.value, {
                    shouldValidate: true,
                    shouldDirty: true
                  });
                }}
                size="small"
                sx={{ marginLeft: 1 }}
                error={!settings.pr_mapping_pattern}
              >
                {IncidentPRMappingOptions.map((value) => {
                  return (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  );
                })}
              </Select>
            )}
          </FlexBox>
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
            disabled={!isDirty || !isValid}
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
