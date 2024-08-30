import { Box, Typography } from '@mui/material';
import { useEffect, useRef } from 'react';

import { fetchServiceLogs, ServiceStatusState } from '@/slices/service';
import { useDispatch, useSelector } from '@/store';

export const SystemLogs = () => {
  const dispatch = useDispatch();
  const services = useSelector(
    (state: { service: { services: ServiceStatusState } }) =>
      state.service.services
  );
  const active = useSelector((s) => s.service.active);
  const workerRef = useRef<Worker>();

  const logs = services[active].logs;

  useEffect(() => {
    workerRef.current = new Worker('/workers/fetchLogsWorker.js');
    workerRef.current.onmessage = (event: MessageEvent<string>) => {
      dispatch(fetchServiceLogs(active));
    };
    workerRef.current?.postMessage('fetchStatus');
    return () => {
      workerRef.current?.terminate();
    };
  });

  return (
    <Box
      sx={{
        backgroundColor: '#1e1e1e',
        padding: 2,
        borderRadius: 2,
        fontFamily: 'monospace',
        color: 'white',
        overflowY: 'auto',
        maxHeight: '650px'
      }}
    >
      {services &&
        logs.map((log, i) => (
          <Typography
            key={i}
            variant="body1"
            sx={{ color: 'white', marginBottom: 1 }}
          >
            {log}
          </Typography>
        ))}
      <Typography variant="body1" sx={{ color: 'white', marginBottom: 1 }}>
        Hello, World!
      </Typography>
    </Box>
  );
};
