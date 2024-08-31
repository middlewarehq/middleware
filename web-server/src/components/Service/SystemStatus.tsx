import { Box, Divider } from '@mui/material';
import { FC, useEffect, useState } from 'react';

import { ServiceNames } from '@/constants/service';
import { CardRoot } from '@/content/DoraMetrics/DoraCards/sharedComponents';
import { serviceSlice, ServiceStatusState } from '@/slices/service';
import { useDispatch, useSelector } from '@/store';

import { FlexBox } from '../FlexBox';
import { useOverlayPage } from '../OverlayPageContext';
import { Line } from '../Text';

export const SystemStatus: FC = () => {
  const dispatch = useDispatch();
  const [error, setError] = useState<string>('');
  const services = useSelector(
    (state: { service: { services: ServiceStatusState } }) =>
      state.service.services
  );
  const loading = useSelector((s) => s.service.loading);

  console.log(services);

  useEffect(() => {
    const eventSource = new EventSource('/api/service/stream');

    eventSource.onopen = (event) => {
      console.log('Connection opened', event);
    };

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // console.log(data);
      if (data.type === 'status-update') {
        dispatch(serviceSlice.actions.setStatus({ statuses: data.statuses }));
      }
      if (data.type === 'log-update') {
        console.log(data.serviceName);
        const newLines = data.content.split('\n'); // Split new content into lines
        const trimmedLines = newLines.filter(
          (line: string) => line.trim() !== ''
        );
        dispatch(
          serviceSlice.actions.setServiceLogs({
            serviceName: data.serviceName,
            serviceLog: trimmedLines
          })
        );
      }
    };

    eventSource.onerror = (event) => {
      console.error('EventSource failed:', event);
      eventSource.close();
    };

    return () => {
      eventSource.close();
      console.log('EventSource closed');
    };
  }, []);

  const { addPage } = useOverlayPage();

  const ServiceTitle: { [key: string]: string } = {
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

      {error && (
        <Box sx={{ color: 'red', mb: 2 }}>
          <p>{error}</p>
        </Box>
      )}

      <FlexBox col gap={2}>
        {services &&
          Object.keys(services).map((serviceName) => {
            const { isUp } = services[serviceName];
            return (
              <CardRoot
                key={serviceName}
                onClick={() => {
                  dispatch(serviceSlice.actions.setActiveService(serviceName));
                  dispatch(serviceSlice.actions.setLoading(true));

                  addPage({
                    page: {
                      ui: 'system_logs',
                      title: `${ServiceTitle[serviceName]} Logs`
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
                    isUp ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)'
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
                      {ServiceTitle[serviceName]}
                      <Box
                        component="span"
                        sx={{
                          display: 'inline-block',
                          marginLeft: '6px',
                          width: '10px',
                          height: '10px',
                          borderRadius: '50%',
                          backgroundColor: isUp ? '#28a745' : '#dc3545'
                        }}
                      ></Box>
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
    </FlexBox>
  );
};
