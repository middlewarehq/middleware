import { Box, Divider, Grid } from '@mui/material';
import { FC, useEffect, useRef, useState } from 'react';

import { CardRoot } from '@/content/DoraMetrics/DoraCards/sharedComponents';
import {
  ServiceStatusState,
  fetchServiceLogs,
  fetchServiceStatus,
  serviceSlice
} from '@/slices/service';
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
  const workerRef = useRef<Worker>();

  useEffect(() => {
    const fetchAndHandleServiceStatus = async () => {
      try {
        await dispatch(fetchServiceStatus()).unwrap();
        if (services) {
          Object.keys(services).forEach((serviceName) => {
            dispatch(fetchServiceLogs(serviceName)).unwrap();
          });
        }
      } catch (err) {
        setError('Failed to fetch service status');
      }
    };

    fetchAndHandleServiceStatus();
    workerRef.current = new Worker('/workers/fetchStatusWorker.js');
    workerRef.current.onmessage = (event: MessageEvent<string>) => {
      console.log('WebWorker Response =>', event.data);
      dispatch(fetchServiceStatus());
    };
    workerRef.current?.postMessage('fetchStatus');
    return () => {
      workerRef.current?.terminate();
    };
  }, [dispatch]);

  const { addPage } = useOverlayPage();

  const ServiceTitle: { [key: string]: string } = {
    'api-server-service': 'Backend Server',
    'redis-service': 'Redis DataBase',
    'postgres-service': 'Postgres DataBase',
    'sync-server-service': 'Sync Server'
  };

  return (
    <FlexBox col gap={2}>
      <Line bold white fontSize="20px">
        System Status
      </Line>

      <Divider />

      {error && (
        <Box>
          <p>{error}</p>
        </Box>
      )}

      <Grid container spacing={4}>
        {services &&
          Object.keys(services).map((serviceName) => {
            const { isUp } = services[serviceName];
            return (
              <Grid item xs={12} key={serviceName} md={6}>
                <CardRoot
                  onClick={() => {
                    dispatch(
                      serviceSlice.actions.setActiveService(serviceName)
                    );
                    addPage({
                      page: {
                        ui: 'system_logs',
                        title: ServiceTitle[serviceName] + ' Logs'
                      }
                    });
                  }}
                >
                  <FlexBox col flexGrow={1} minHeight={'8em'}>
                    <FlexBox paddingX={2} alignCenter>
                      <FlexBox alignCenter>
                        <Line white huge bold py={1}>
                          {`${ServiceTitle[serviceName]} `}
                        </Line>
                      </FlexBox>
                    </FlexBox>

                    <FlexBox col relative fullWidth flexGrow={1}>
                      <FlexBox
                        position="absolute"
                        fill
                        col
                        paddingX={3}
                        gap1
                        justifyCenter
                      >
                        <FlexBox justifyCenter sx={{ width: '100%' }} col>
                          <Line bigish medium color={isUp ? 'green' : 'red'}>
                            {isUp
                              ? 'Status: Healthy'
                              : 'Status: Not Operational'}
                          </Line>
                          <FlexBox alignCenter></FlexBox>
                        </FlexBox>
                      </FlexBox>
                    </FlexBox>
                  </FlexBox>
                </CardRoot>
              </Grid>
            );
          })}
      </Grid>
    </FlexBox>
  );
};
