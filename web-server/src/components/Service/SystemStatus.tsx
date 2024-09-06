import { Box, CircularProgress, Divider, useTheme } from '@mui/material';
import { FC, useEffect } from 'react';
import { alpha } from '@mui/material/styles';

import { ServiceNames } from '@/constants/service';
import { StreamEventType } from '@/constants/stream';
import { CardRoot } from '@/content/DoraMetrics/DoraCards/sharedComponents';
import { serviceSlice } from '@/slices/service';
import { useDispatch, useSelector } from '@/store';

import { FlexBox } from '../FlexBox';
import { useOverlayPage } from '../OverlayPageContext';
import { Line } from '../Text';

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
        const statuses = { statuses: data.statuses };
        dispatch(serviceSlice.actions.setStatus(statuses));
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

    eventSource.onerror = () => {
      eventSource.close();
    };

    return () => {
      eventSource.close();
      dispatch(serviceSlice.actions.resetState());
    };
  }, [dispatch]);

  const { addPage } = useOverlayPage();

  const ServiceTitle: Record<ServiceNames, string> = {
    [ServiceNames.API_SERVER]: 'Backend Server',
    [ServiceNames.REDIS]: 'Redis Database',
    [ServiceNames.POSTGRES]: 'Postgres Database',
    [ServiceNames.SYNC_SERVER]: 'Sync Server'
  };

  return (
    <FlexBox col gap={2} sx={{ padding: '16px' }}>
      <Line bold white fontSize="24px" sx={{ mb: 2 }}>
        System Status
      </Line>
      <Divider sx={{ mb: 2, backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />

      {loading ? (
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <CircularProgress color="primary" size={50} />
        </Box>
      ) : (
        <FlexBox col gap={2}>
          {Object.keys(services).map((serviceName) => {
            const serviceKey = serviceName as ServiceNames;
            const { isUp } = services[serviceKey];

            return (
              <CardRoot
                key={serviceName}
                onClick={() => {
                  addPage({
                    page: {
                      ui: 'system_logs',
                      title: `${ServiceTitle[serviceKey]} Logs`,
                      props: { serviceName }
                    }
                  });
                }}
                sx={{
                  transition: 'box-shadow 0.2s ease',
                  '&:hover': {
                    boxShadow: '0 4px 15px rgba(0, 0, 0, 0.1)'
                  },
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '12px',
                  border: `1px solid ${
                    isUp
                      ? alpha(theme.colors.success.main, 0.3)
                      : alpha(theme.colors.error.main, 0.3)
                  }`,
                  padding: '16px',
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                <FlexBox col flexGrow={1} minHeight="5em">
                  <FlexBox alignCenter justifyContent="space-between">
                    <Line
                      white
                      bold
                      sx={{
                        fontSize: '1.2em',
                        display: 'flex',
                        alignItems: 'center'
                      }}
                    >
                      {ServiceTitle[serviceKey]}
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-block',
                          marginLeft: '6px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: isUp
                            ? theme.colors.success.main
                            : theme.colors.error.main
                        }}
                      />
                    </Line>
                  </FlexBox>

                  <FlexBox col relative fullWidth flexGrow={1}>
                    <FlexBox
                      alignCenter
                      sx={{ width: '100%', paddingTop: '8px' }}
                    >
                      <Line
                        sx={{
                          fontWeight: '500',
                          fontSize: '0.95em',
                          color: isUp ? '#28a745' : '#dc3545',
                          lineHeight: '1.4'
                        }}
                      >
                        {isUp ? 'Status: Healthy' : 'Status: Not Operational'}
                      </Line>
                    </FlexBox>
                  </FlexBox>
                </FlexBox>
              </CardRoot>
            );
          })}
        </FlexBox>
      )}
    </FlexBox>
  );
};
