import { yupResolver } from '@hookform/resolvers/yup';
import { Delete, HelpOutlineRounded } from '@mui/icons-material';
import AddIcon from '@mui/icons-material/Add';
import { LoadingButton } from '@mui/lab';
import {
  Autocomplete,
  Box,
  Button,
  Divider,
  IconButton,
  ListItem,
  MenuItem,
  Select,
  Stack,
  TextField
} from '@mui/material';
import { useSnackbar } from 'notistack';
import { FC, useEffect } from 'react';
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
import { ActiveBranchMode } from '@/types/resources';

import { FlexBox } from './FlexBox';
import { LightTooltip, IOSSwitch } from './Shared';
import { Line } from './Text';

const incidentPRFilterFormSchema = yup
  .object({
    setting: yup
      .object({
        include_revert_prs: yup.boolean(),
        filters: yup.array(
          yup.object({
            field: yup.string().required(),
            value: yup
              .string()
              .required()
              .test(
                'regex-group',
                'Regex must contain exactly one (\\d+) match group',
                (val) => {
                  if (!val) return false;
                  const match = val.match(/\(\\d\+\)/g);
                  return match && match.length === 1;
                }
              )
          })
        )
      })
      .required()
  })
  .required();

type incidentPRFilterFormSchema = yup.InferType<
  typeof incidentPRFilterFormSchema
>;

const fields = [
  { label: 'Title', value: 'title' },
  { label: 'Head Branch', value: 'head_branch' }
];

const regexOptions = [
  {
    value: '^revert-(\\d+)',
    example: 'revert-123anything'
  },
  {
    value: '^revert-pr-(\\d+)$',
    example: 'revert-pr-123'
  },
  {
    value: '(?i)revert #(\\d+)',
    example: 'Revert #123: fix module versions'
  },
  {
    value: '(?i)revert pr (\\d+)',
    example: 'Fix Revert PR 1011 - update config'
  }
];

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
    formState: { isDirty, isValid, errors },
    setValue
  } = addUserMethods;

  const settings = watch('setting');

  const handleSave = async () => {
    const updateConfArgs = {
      team_id: singleTeamId,
      setting: settings
    };

    isSaving.set(true);

    if (
      settings.filters.length === 1 &&
      !settings.filters[0].field &&
      !settings.filters[0].value
    ) {
      setValue(`setting.filters`, [], {
        shouldValidate: true,
        shouldDirty: true
      });
    }

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

  useEffect(() => {
    if (settings.filters.length === 0) {
      setValue(`setting.filters`, [{ field: '', value: '' }]);
    }
  }, [settings.filters, setValue]);

  return (
    <FlexBox gap={2} col maxWidth={'560px'}>
      <Line white small mt={-1} textAlign={'start'}>
        Define regex-based filters to get Incidents based on PRs for better CFR
        and MTTR tracking. 🚀
      </Line>

      <Divider />

      <FormProvider {...addUserMethods}>
        <FlexBox col gap2>
          <FlexBox>
            <Line big flexGrow={1}>
              Include Reverted PR Incidents
            </Line>
            <IOSSwitch
              checked={settings.include_revert_prs}
              onChange={(_, isEnabled) => {
                setValue(`setting.include_revert_prs`, isEnabled, {
                  shouldDirty: true,
                  shouldValidate: true
                });
              }}
            ></IOSSwitch>
          </FlexBox>
          <FlexBox alignCenter gap1 mt={1}>
            <Line big>Incident PR Filters</Line>
            <FlexBox
              title={
                <Line tiny white>
                  Only <Line bold>Regex Patterns</Line> are supported to link to
                  the Original PR being reverted. For custom regex, you should
                  exactly have single match group in regex defined by{' '}
                  <Line bold>(\d+)</Line>
                </Line>
              }
              darkTip
            >
              <HelpOutlineRounded sx={{ fontSize: '1.4em' }} />
            </FlexBox>
          </FlexBox>
          <Box sx={{ width: '100%' }}>
            <Stack spacing={2}>
              {settings.filters.map((filter, idx) => (
                <FlexBox key={idx} alignCenter gap1 width="100%">
                  {idx === 0 ? (
                    <Line width="fit-content">PRs where</Line>
                  ) : (
                    <Line width="fit-content">OR</Line>
                  )}
                  <Select
                    value={filter.field}
                    onChange={(e) =>
                      setValue(`setting.filters.${idx}.field`, e.target.value, {
                        shouldValidate: true,
                        shouldDirty: true
                      })
                    }
                    displayEmpty
                    size="small"
                    sx={{ width: 'fit-content' }}
                  >
                    <MenuItem value="">Select Field</MenuItem>
                    {fields.map((f) => (
                      <MenuItem key={f.value} value={f.value}>
                        {f.label}
                      </MenuItem>
                    ))}
                  </Select>
                  <Line width="fit-content">follows regex</Line>
                  <Box flexGrow={1}>
                    <Autocomplete
                      freeSolo
                      options={regexOptions.map((option) => option.value)}
                      value={filter.value}
                      onInputChange={(_, value) => {
                        setValue(`setting.filters.${idx}.value`, value, {
                          shouldValidate: true,
                          shouldDirty: true
                        });
                      }}
                      sx={{ width: '100%' }}
                      renderInput={(params) => {
                        const errorMsg =
                          filter.value &&
                          errors.setting?.filters[idx]?.value?.message;

                        return (
                          <LightTooltip
                            title={
                              errorMsg ? (
                                <Line tiny medium>
                                  {errorMsg}
                                </Line>
                              ) : (
                                ''
                              )
                            }
                            placement="top"
                            arrow={true}
                          >
                            <TextField
                              {...params}
                              placeholder="value"
                              size="small"
                              error={Boolean(errorMsg)}
                            />
                          </LightTooltip>
                        );
                      }}
                      renderOption={(props, option) => {
                        const found = regexOptions.find(
                          (opt) => opt.value === option
                        );
                        return (
                          <ListItem
                            {...props}
                            key={option}
                            style={{ all: 'unset' }}
                          >
                            <Box
                              sx={{
                                px: 2,
                                py: 1,
                                cursor: 'pointer',
                                '&:hover': {
                                  backgroundColor: 'primary.light'
                                }
                              }}
                            >
                              <Box>{found ? found.value : option}</Box>
                              {found && (
                                <Box>
                                  <Line tiny secondary>
                                    {found.example}
                                  </Line>
                                </Box>
                              )}
                            </Box>
                          </ListItem>
                        );
                      }}
                    />
                  </Box>
                  <IconButton
                    size="small"
                    aria-label="Delete row"
                    onClick={() => {
                      const updatedFilters = settings.filters.filter(
                        (_, i) => i !== idx
                      );
                      setValue(`setting.filters`, updatedFilters, {
                        shouldValidate: true,
                        shouldDirty: true
                      });
                    }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </FlexBox>
              ))}
            </Stack>
            <Button
              sx={{ mt: 3 }}
              startIcon={<AddIcon />}
              variant="outlined"
              size="small"
              onClick={() => {
                setValue(
                  `setting.filters`,
                  [...settings.filters, { field: '', value: '' }],
                  {
                    shouldValidate: true,
                    shouldDirty: true
                  }
                );
              }}
            >
              Add Filter
            </Button>
          </Box>
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
            disabled={
              !isDirty ||
              !(
                isValid ||
                (settings.filters.length === 1 &&
                  !settings.filters[0].field &&
                  !settings.filters[0].value)
              )
            }
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
