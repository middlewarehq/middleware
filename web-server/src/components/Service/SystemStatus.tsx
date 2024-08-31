import { Box, Button, Divider, Typography } from '@mui/material';
import { FC, useEffect, useState } from 'react';

import { ServiceNames } from '@/constants/service';
import service, { serviceSlice, ServiceStatusState } from '@/slices/service';
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

  // useEffect(() => {
  //   // const fetchAndHandleServiceStatus = async () => {
  //   //   try {
  //   //     await dispatch(fetchServiceStatus()).unwrap();
  //   //     dispatch(serviceSlice.actions.setLoading(true));

  //   //   } catch (err) {
  //   //     setError('Failed to fetch service status');
  //   //   }
  //   // };

  //   // fetchAndHandleServiceStatus();

  // }, [dispatch]);

  useEffect(() => {
    const eventSource = new EventSource('/api/service/stream');

    eventSource.onopen = (event) => {
      console.log('Connection opened', event);
    };

    // eventSource.addEventListener("message", (event) => { console.log(event) })
    eventSource.onmessage = (event) => {
      console.log('Message received', event);
      // Parse the data and update your component state here
      const data = JSON.parse(event.data);
      console.log(data);

      dispatch(serviceSlice.actions.setStatus(data));

      // For example: setLastUpdate(data.time);
    };

    eventSource.addEventListener('state', function (event) {
      const data = JSON.parse(event.data);
      console.log('State:', data);
    });

    eventSource.onerror = (event) => {
      console.error('EventSource failed:', event);
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
      <Button
        onClick={() => {
          addPage({
            page: {
              ui: 'system_logs',
              title: ` Logs`
            }
          });
        }}
      ></Button>

      <FlexBox col gap={2}>
        {/* {services && loading &&
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
                  border: `1px solid ${isUp ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)'
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
          })} */}
        <Box
          sx={{
            padding: '16px 24px',
            borderRadius: 2,
            color: 'white',
            overflowY: 'auto',
            maxHeight: '650px',
            backgroundColor: '#333'
          }}
        >
          {Object.entries(services).map(([serviceName, serviceData]) => (
            <Box
              key={serviceName}
              sx={{
                marginBottom: 2,
                padding: '12px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                borderRadius: 1
              }}
            >
              <Typography
                variant="h6"
                sx={{
                  color: 'rgba(255, 255, 255, 0.8)',
                  fontWeight: 'bold',
                  marginBottom: 1
                }}
              >
                {serviceName}
              </Typography>
              <Typography
                variant="body2"
                sx={{
                  color: serviceData.isUp ? 'lightgreen' : 'red',
                  marginBottom: 1
                }}
              >
                Status: {serviceData.isUp ? 'Up' : 'Down'}
              </Typography>
              <Box
                sx={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  backgroundColor: '#222',
                  padding: '8px',
                  borderRadius: 1
                }}
              >
                {serviceData.logs.length > 0 ? (
                  serviceData.logs.map((log, index) => (
                    <Typography
                      key={index}
                      variant="body2"
                      sx={{
                        color: 'white',
                        marginBottom: 0.5,
                        fontSize: '0.875rem'
                      }}
                    >
                      {log}
                    </Typography>
                  ))
                ) : (
                  <Typography
                    variant="body2"
                    sx={{
                      color: 'gray',
                      fontStyle: 'italic'
                    }}
                  >
                    No logs available
                  </Typography>
                )}
              </Box>
            </Box>
          ))}
        </Box>
      </FlexBox>
    </FlexBox>
  );
};
