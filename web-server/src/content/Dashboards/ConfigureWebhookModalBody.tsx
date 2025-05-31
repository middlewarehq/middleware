import { LoadingButton } from '@mui/lab';
import { Box, Divider, Typography, Paper, Tab, Tabs } from '@mui/material';
import { useSnackbar } from 'notistack';
import { memo, useCallback, useEffect } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { Integration } from '@/constants/integrations';
import { useModal } from '@/contexts/ModalContext';
import { useAuth } from '@/hooks/useAuth';
import { useBoolState, useEasyState } from '@/hooks/useEasyState';
import { getWebhookAPIKey } from '@/slices/org';
import { useDispatch, useSelector } from '@/store';
import {
  linkProvider,
  unlinkProvider,
  generateRandomToken
} from '@/utils/auth';
import { depFn } from '@/utils/fn';

import {
  CopyTextComponent,
  WebhookDocumentation
} from './WebhookDocumentation';

export const ConfigureWebhookModalBody = () => {
  const dispatch = useDispatch();
  const { addModal } = useModal();
  const { enqueueSnackbar } = useSnackbar();
  const { orgId } = useAuth();
  const isLoading = useBoolState();
  const webhookAPIKey = useSelector((state) => state.org.webhookAPIKey);

  useEffect(() => {
    depFn(isLoading.true);
    dispatch(getWebhookAPIKey({ orgId })).finally(isLoading.false);
  }, [dispatch, orgId]);

  const handleCreateKey = useCallback(async () => {
    depFn(isLoading.true);
    const randomApiKey = generateRandomToken();

    linkProvider(randomApiKey, orgId, Integration.WEBHOOK)
      .then(async () => {
        await dispatch(getWebhookAPIKey({ orgId }));
        enqueueSnackbar('API Key created successfully', {
          variant: 'success',
          autoHideDuration: 2000
        });
      })
      .catch(() => {
        enqueueSnackbar('Failed to create API key', {
          variant: 'error',
          autoHideDuration: 2000
        });
      })
      .finally(isLoading.false);
  }, [dispatch, isLoading, orgId, enqueueSnackbar]);

  const handleDeleteKey = useCallback(async () => {
    depFn(isLoading.true);

    unlinkProvider(orgId, Integration.WEBHOOK)
      .then(async () => {
        await dispatch(getWebhookAPIKey({ orgId }));
        enqueueSnackbar('API Key deleted successfully', {
          variant: 'success',
          autoHideDuration: 2000
        });
      })
      .catch(() => {
        enqueueSnackbar('Failed to delete API key', {
          variant: 'error',
          autoHideDuration: 2000
        });
      })
      .finally(isLoading.false);
  }, [dispatch, isLoading, orgId, enqueueSnackbar]);

  const openConfirmDeleteAPIKeyModal = useCallback(async () => {
    addModal({
      title: `Confirm Delete API Key`,
      body: (
        <FlexBox
          gap2
          flexDirection="column"
          maxWidth={500}
          sx={{ color: 'text.secondary' }}
        >
          <Line>
            Deleting this API key is permanent. Any services using it to send
            webhook data will no longer be processed by our system. You can
            generate a new API key anytime if needed.
          </Line>
          <Line sx={{ fontWeight: 500 }}>
            Are you sure you want to proceed?
          </Line>
        </FlexBox>
      ),
      actions: {
        confirm: handleDeleteKey,
        confirmType: 'error'
      },
      showCloseIcon: true
    });
  }, [addModal, handleDeleteKey]);

  return (
    <FlexBox gap2 maxWidth="1400px">
      <FlexBox gap2 minWidth={'400px'} col>
        <FlexBox>Webhook API key for payload validation</FlexBox>
        {webhookAPIKey ? (
          <CopyTextComponent text={webhookAPIKey} />
        ) : (
          <FlexBox
            p={2}
            mt={2 / 3}
            sx={{
              backgroundColor: 'rgba(255, 255, 255, 0.04)',
              borderRadius: 1
            }}
          >
            Your API key will appear here once generated.
          </FlexBox>
        )}

        <FlexBox justifyEnd>
          {webhookAPIKey ? (
            <LoadingButton
              loading={isLoading.value}
              variant="outlined"
              color="error"
              onClick={openConfirmDeleteAPIKeyModal}
            >
              Delete Key
            </LoadingButton>
          ) : (
            <LoadingButton
              loading={isLoading.value}
              variant="outlined"
              onClick={handleCreateKey}
            >
              Generate New Key
            </LoadingButton>
          )}
        </FlexBox>
      </FlexBox>
      <Divider orientation="vertical" flexItem />
      <DocumentContainer />
    </FlexBox>
  );
};

const DocumentContainer = memo(() => {
  const selectedTab = useEasyState(0);
  return (
    <FlexBox col gap1 maxWidth={'100%'} overflow={'auto'}>
      <div
        style={{
          overflow: 'hidden',
          borderRadius: '12px',
          height: 'calc(100vh - 300px)',
          overflowY: 'auto',
          transition: 'all 0.8s ease',
          position: 'relative',
          maxWidth: '100%'
        }}
      >
        <Paper sx={{ p: 1 }}>
          <Tabs
            value={selectedTab.value}
            onChange={(_, newValue) => selectedTab.set(newValue)}
            sx={{
              borderBottom: 1,
              borderColor: 'divider',
              '& .MuiTabs-indicator': {
                backgroundColor: 'primary.main'
              }
            }}
          >
            <Tab label="Workflow" />
            <Tab label="Incident" />
          </Tabs>

          {selectedTab.value === 0 ? (
            <DeploymentsWebhookDocs />
          ) : (
            <IncidentsWebhookDocs />
          )}
        </Paper>
      </div>
    </FlexBox>
  );
});

const DeploymentsWebhookDocs = () => {
  const requestBody = {
    workflow_runs: [
      {
        workflow_name: 'string',
        repo_urls: ['string'],
        event_actor: 'string',
        head_branch: 'string',
        workflow_run_unique_id: 'string',
        status: 'string',
        duration: 'string',
        workflow_run_conducted_at: 'string (ISO 8601 format)',
        html_url: 'string'
      }
    ]
  };

  const fields = [
    {
      primaryText: 'workflow_name',
      secondaryText: 'Name of the workflow'
    },
    {
      primaryText: 'repo_urls',
      secondaryText:
        'Array of repository urls ( Ex: https://github.com/middlewarehq/middleware ) associated with the workflow. Ensure they are valid and linked with Middleware.'
    },
    {
      primaryText: 'event_actor',
      secondaryText: 'Username of the person who triggered the workflow'
    },
    {
      primaryText: 'head_branch',
      secondaryText: 'Branch on which the workflow was run'
    },
    {
      primaryText: 'status',
      secondaryText:
        'Status of the workflow run ( PENDING, SUCCESS, FAILURE, CANCELLED )'
    },
    {
      primaryText: 'workflow_run_conducted_at',
      secondaryText:
        'Timestamp of when the workflow was conducted ( ISO 8601 format )'
    },
    {
      primaryText: 'duration ( Optional )',
      secondaryText: (
        <Line>
          Duration the workflow ran for. It can be automatically inferred by
          calling this webhook at both the start and end of the workflow with
          the correct value of{' '}
          <Line color="lightgreen">workflow_run_conducted_at</Line>. Example:
          Call the webhook with status <b>"PENDING"</b> at the start, and later
          with <b>"SUCCESS"</b>, <b>"FAILURE"</b>, or <b>"CANCELLED"</b> to mark
          the end.
        </Line>
      )
    },
    {
      primaryText: 'html_url ( Optional )',
      secondaryText: 'Link to your workflow run'
    }
  ];

  return (
    <Box p={4}>
      <WebhookDocumentation
        title="Deployments Webhook Documentation"
        description="Webhooks in our system allow external services to send real-time deployment data to the system via HTTP POST request."
        endpoint="<your-backend-url>/public/webhook/workflow"
        requestBody={requestBody}
        requestBodyFields={fields}
      />

      <Divider sx={{ my: 2 }} />

      <Typography variant="h4" gutterBottom mb={2}>
        After you have uploaded your data
      </Typography>

      <FlexBox gap2 flexDirection={'column'} fontSize="medium">
        <Line>
          Once you have sent data to our system through the webhook, we will
          process that data to be analyzed by our system. You will be able to
          see the data shortly after you have called our webhook.
        </Line>
        <Line>
          Next you can go over to <b>Manage Teams {'->'} Edit a Team.</b>
          &nbsp;From the repos you provided in{' '}
          <Line color="lightgreen">repo_urls</Line>, Select <b>WORKFLOW</b> as
          Source of deployment and you will see a list of Workflow names.
        </Line>
        <Line>
          Go over to the DORA Metrics page and click on the Deployment Frequency
          box. Select your repo name and you will find the list of the workflow
          runs you uploaded.
        </Line>
      </FlexBox>
    </Box>
  );
};

const IncidentsWebhookDocs = () => {
  return (
    <Box p={4} width="1200px">
      <Line fontSize={24} mb={1}>
        Incidents Webhook Documentation
      </Line>
    </Box>
  );
};
