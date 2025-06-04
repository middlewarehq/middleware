import { Button, CircularProgress, Divider, useTheme } from '@mui/material';
import { FC, useEffect } from 'react';

import { ServiceNames } from '@/constants/service';
import { StreamEventType } from '@/constants/stream';
import { serviceSlice } from '@/slices/service';
import { useDispatch, useSelector } from '@/store';

import { FlexBox } from '../FlexBox';
import { useOverlayPage } from '../OverlayPageContext';
import { Line } from '../Text';

const serviceTitle: Record<ServiceNames, string> = {
  [ServiceNames.API_SERVER]: 'Backend Server',
  [ServiceNames.REDIS]: 'Redis Database',
  [ServiceNames.POSTGRES]: 'Postgres Database',
  [ServiceNames.SYNC_SERVER]: 'Sync Server',
  [ServiceNames.QUEUE]: 'Queue Service'
};

const serviceColor: Record<ServiceNames, string> = {
  [ServiceNames.API_SERVER]: '#06d6a0',
  [ServiceNames.REDIS]: '#ef476f',
  [ServiceNames.POSTGRES]: '#ff70a6',
  [ServiceNames.SYNC_SERVER]: '#ab34eb',
  [ServiceNames.QUEUE]: '#3a86ff'
};

export const SystemStatus: FC = () => {
  const dispatch = useDispatch();
  const theme = useTheme();
  const loading = useSelector((state) => state.service.loading);
  const services = useSelector((state) => state.service.services);

  useEffect(() => {
    const eventSource = new EventSource(`/api/stream`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === StreamEventType.StatusUpdate) {
        dispatch(serviceSlice.actions.setStatus({ statuses: data.statuses }));
      }
      if (data.type === StreamEventType.LogUpdate) {
        const { serviceName, content } = data;
        const newLines = content.split('\n');
        const trimmedLines = newLines.filter(
          (line: string) => line.trim() !== ''
        );
        dispatch(
          serviceSlice.actions.setServiceLogs({
            serviceName,
            serviceLog: trimmedLines
          })
        );
      }
    };

    return () => {
      eventSource.close();
      dispatch(serviceSlice.actions.resetState());
    };
  }, [dispatch]);

  const { addPage } = useOverlayPage();

  const handleCardClick = (serviceName: ServiceNames) => {
    addPage({
      page: {
        ui: 'system_logs',
        title: `${serviceTitle[serviceName]} Logs`,
        props: { serviceName }
      }
    });
  };

  return (
    <FlexBox col gap={2} padding={'16px'}>
      <Line bold white huge marginBottom={2}>
        System Status
      </Line>
      <Divider sx={{ mb: 2, backgroundColor: theme.colors.secondary.light }} />
      {loading ? (
        <FlexBox justifyCenter alignCenter fill>
          <CircularProgress size={'60px'} />
        </FlexBox>
      ) : (
        <FlexBox col gap={2}>
          {Object.keys(services).map((serviceName) => {
            const serviceKey = serviceName as ServiceNames;
            const { isUp } = services[serviceKey];
            const borderColor = serviceColor[serviceKey];

            return (
              <Button
                key={serviceName}
                onClick={() => handleCardClick(serviceKey)}
                sx={{
                  border: `1px solid ${
                    isUp ? borderColor : theme.colors.error.main
                  }`
                }}
              >
                <FlexBox col flexGrow={1} minHeight="5em">
                  <FlexBox alignCenter justifyContent="space-between">
                    <Line white bold bigish display={'flex'}>
                      {serviceTitle[serviceKey]}
                      <FlexBox
                        component="span"
                        marginLeft={'6px'}
                        borderRadius={'50%'}
                        width={'10px'}
                        height={'10px'}
                        bgcolor={
                          isUp
                            ? theme.colors.success.main
                            : theme.colors.error.main
                        }
                      />
                    </Line>
                  </FlexBox>

                  <FlexBox col relative fullWidth flexGrow={1}>
                    <FlexBox alignCenter fullWidth paddingTop={'8px'}>
                      <Line semibold white>
                        Status:{' '}
                        <span
                          style={{
                            color: isUp
                              ? theme.colors.success.main
                              : theme.colors.error.main
                          }}
                        >
                          {isUp ? 'Healthy' : 'Not Operational'}
                        </span>
                      </Line>
                    </FlexBox>
                  </FlexBox>
                </FlexBox>
              </Button>
            );
          })}
        </FlexBox>
      )}
    </FlexBox>
  );
};
