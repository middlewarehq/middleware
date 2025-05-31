import {
    ArrowForwardIosRounded,
    ChevronRightRounded,
    SettingsRounded
  } from '@mui/icons-material';
  import { Button, useTheme } from '@mui/material';
  import CircularProgress from '@mui/material/CircularProgress';
  import { useSnackbar } from 'notistack';
  import { FC, ReactNode, useEffect } from 'react';
  
  import { FlexBox } from '@/components/FlexBox';
  import { Line } from '@/components/Text';
  import { track } from '@/constants/events';
  import { FetchState } from '@/constants/ui-states';
  import { bitBucketIntegrationDisplay } from '@/content/Dashboards/githubIntegration';
  import { useIntegrationHandlers } from '@/content/Dashboards/useIntegrationHandlers';
  import { useAuth } from '@/hooks/useAuth';
  import { useBoolState } from '@/hooks/useEasyState';
  import { fetchCurrentOrg } from '@/slices/auth';
  import { useDispatch, useSelector } from '@/store';
  
  const cardRadius = 10.5;
  const cardBorder = 1.5;
  const getRadiusWithPadding = (radius: number, padding: number) =>
    `${radius + padding}px`;
  
  export const BitbucketIntegrationCard = () => {
    const theme = useTheme();
    const { integrations } = useAuth();
    const isBitbucketIntegrated = integrations.bitbucket;
    const sliceLoading = useSelector(
      (s: { auth: { requests: { org: FetchState; }; }; }) => s.auth.requests.org === FetchState.REQUEST
    );
    const { link, unlink } = useIntegrationHandlers();
  
    const localLoading = useBoolState(false);
  
    const isLoading = sliceLoading || localLoading.value;
  
    const dispatch = useDispatch();
  
    const { enqueueSnackbar } = useSnackbar();
  
    return (
      <FlexBox relative>
        {isBitbucketIntegrated && (
          <FlexBox
            title="Linked"
            sx={{
              position: 'absolute',
              right: '-6px',
              top: '-6px',
              zIndex: 2
            }}
          >
            <LinkedIcon />
          </FlexBox>
        )}
        <FlexBox
          p={`${cardBorder}px`}
          corner={getRadiusWithPadding(cardRadius, cardBorder)}
          sx={{ background: bitBucketIntegrationDisplay.bg }}
          relative
          overflow={'unset'}
        >
          <FlexBox
            height="120px"
            width="280px"
            corner={`${cardRadius}px`}
            col
            p={1.5}
            relative
            bgcolor={theme.palette.background.default}
          >
            <FlexBox
              position="absolute"
              fill
              top={0}
              left={0}
              sx={{ opacity: 0.2, background: bitBucketIntegrationDisplay.bg }}
            />
            <FlexBox alignCenter gap1 fit>
              <FlexBox fit color={bitBucketIntegrationDisplay.color}>
                {bitBucketIntegrationDisplay.icon}
              </FlexBox>
              <Line big medium white>
                {bitBucketIntegrationDisplay.name}
              </Line>
            </FlexBox>
            <FlexBox alignCenter gap1 mt="auto">
              <IntegrationActionsButton
                onClick={async () => {
                  track(
                    isBitbucketIntegrated
                      ? 'INTEGRATION_UNLINK_TRIGGERED'
                      : 'INTEGRATION_LINK_TRIGGERED',
                    { integration_name: bitBucketIntegrationDisplay.name }
                  );
                  if (!isBitbucketIntegrated) {
                    link.bitbucket();
                    return;
                  }
                  const shouldExecute = window.confirm(
                    'Are you sure you want to unlink?'
                  );
                  if (shouldExecute) {
                    localLoading.true();
                    await unlink
                      .bitbucket()
                      .then(() => {
                        enqueueSnackbar('Bitbucket unlinked successfully', {
                          variant: 'success'
                        });
                      })
                      .then(async () => dispatch(fetchCurrentOrg()))
                      .catch((e: any) => {
                        console.error('Failed to unlink Bitbucket', e);
                        enqueueSnackbar('Failed to unlink Bitbucket', {
                          variant: 'error'
                        });
                      })
                      .finally(localLoading.false);
                  }
                }}
                label={!isBitbucketIntegrated ? 'Link' : 'Unlink'}
                bgOpacity={!isBitbucketIntegrated ? 0.45 : 0.25}
                endIcon={
                  isLoading ? (
                    <CircularProgress
                      size={theme.spacing(1)}
                      sx={{ ml: 1 / 2 }}
                    />
                  ) : (
                    <ChevronRightRounded
                      fontSize="small"
                      sx={{ ml: 1 / 2, mr: -2 / 3 }}
                    />
                  )
                }
                minWidth="72px"
              />
            </FlexBox>
          </FlexBox>
        </FlexBox>
      </FlexBox>
    );
  };
  
  const IntegrationActionsButton: FC<{
    onClick: () => void | Promise<void>;
    label: ReactNode;
    bgOpacity?: number;
    startIcon?: ReactNode;
    endIcon?: ReactNode;
    minWidth?: string;
  }> = ({
    label,
    onClick,
    bgOpacity = 0.45,
    endIcon = (
      <ArrowForwardIosRounded sx={{ fontSize: '0.9em' }} htmlColor="white" />
    ),
    startIcon = <SettingsRounded sx={{ fontSize: '1em' }} htmlColor="white" />,
    minWidth = '80px'
  }) => {
    const theme = useTheme();
  
    return (
      <Button
        variant="text"
        sx={{
          p: '1px',
          minWidth: 0,
          background: bitBucketIntegrationDisplay.bg,
          position: 'relative',
          borderRadius: getRadiusWithPadding(6, 1),
          fontSize: '0.9em'
        }}
        onClick={onClick}
      >
        <FlexBox
          position="absolute"
          fill
          top={0}
          left={0}
          sx={{
            opacity: bgOpacity,
            background: bitBucketIntegrationDisplay.bg,
            transition: 'all 0.2s',
            ':hover': {
              opacity: bgOpacity * 0.6
            }
          }}
          corner="6px"
        />
        <FlexBox
          bgcolor={theme.palette.background.default}
          px={1}
          py={1 / 4}
          corner="6px"
          color="white"
          alignCenter
          gap={1 / 4}
          minWidth={minWidth}
        >
          {startIcon}
          <Line mr="auto">{label}</Line>
          {endIcon}
        </FlexBox>
      </Button>
    );
  };
  
  const LinkedIcon = () => {
    const isVisible = useBoolState(false);
    useEffect(() => {
      setTimeout(isVisible.true, 200);
    }, [isVisible.true]);
    return (
      <svg
        style={{
          opacity: isVisible.value ? 1 : 0,
          transform: isVisible.value ? 'scale(1)' : 'scale(0)',
          transition: 'all 0.2s ease'
        }}
        width="26"
        height="26"
        viewBox="0 0 26 26"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <g clipPath="url(#clip0_211_974)">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M0 13C0 9.55219 1.36964 6.24558 3.80761 3.80761C6.24558 1.36964 9.55219 0 13 0C16.4478 0 19.7544 1.36964 22.1924 3.80761C24.6304 6.24558 26 9.55219 26 13C26 16.4478 24.6304 19.7544 22.1924 22.1924C19.7544 24.6304 16.4478 26 13 26C9.55219 26 6.24558 24.6304 3.80761 22.1924C1.36964 19.7544 0 16.4478 0 13ZM12.2581 18.564L19.7427 9.20747L18.3907 8.12587L12.0085 16.1009L7.488 12.3344L6.37867 13.6656L12.2581 18.564Z"
            fill="#14AE5C"
          />
        </g>
        <defs>
          <clipPath id="clip0_211_974">
            <rect width="26" height="26" fill="white" />
          </clipPath>
        </defs>
      </svg>
    );
  };
