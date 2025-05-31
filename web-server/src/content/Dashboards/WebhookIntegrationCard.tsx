import {
  ArrowForwardIosRounded,
  ChevronRightRounded,
  SettingsRounded
} from '@mui/icons-material';
import { Button, useTheme } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { FC, ReactNode } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { FetchState } from '@/constants/ui-states';
import { webhookIntegrationDisplay } from '@/content/Dashboards/integrationDisplayConfigs';
import { useIntegrationHandlers } from '@/content/Dashboards/useIntegrationHandlers';
import { useBoolState } from '@/hooks/useEasyState';
import { useSelector } from '@/store';

const cardRadius = 10.5;
const cardBorder = 1.5;
const getRadiusWithPadding = (radius: number, padding: number) =>
  `${radius + padding}px`;

export const WebhookIntegrationCard = () => {
  const theme = useTheme();

  const sliceLoading = useSelector(
    (s) => s.auth.requests.org === FetchState.REQUEST
  );
  const { link } = useIntegrationHandlers();

  const localLoading = useBoolState(false);

  const isLoading = sliceLoading || localLoading.value;

  return (
    <FlexBox relative>
      <FlexBox
        p={`${cardBorder}px`}
        corner={getRadiusWithPadding(cardRadius, cardBorder)}
        sx={{ background: webhookIntegrationDisplay.bg }}
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
            sx={{ opacity: 0.2, background: webhookIntegrationDisplay.bg }}
          />
          <FlexBox alignCenter gap1 fit>
            <FlexBox fit color={webhookIntegrationDisplay.color}>
              {webhookIntegrationDisplay.icon}
            </FlexBox>
            <Line big medium white>
              {webhookIntegrationDisplay.name}
            </Line>
          </FlexBox>
          <FlexBox alignCenter gap1 mt="auto">
            <IntegrationActionsButton
              onClick={async () => {
                link.webhook();
              }}
              label={'Setup'}
              bgOpacity={0.45}
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
  onClick: AnyFunction;
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
        background: webhookIntegrationDisplay.bg,
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
          background: webhookIntegrationDisplay.bg,
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
