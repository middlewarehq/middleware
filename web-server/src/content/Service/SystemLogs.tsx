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
  return (
    <Box
      sx={{
        padding: '16px 24px',
        borderRadius: 2,
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
            sx={{
              display: 'flex',
              alignItems: 'center',
              color: 'white',
              marginBottom: 1.5,
              padding: '8px 12px',
              borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
              '&:last-child': { borderBottom: 'none' },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                cursor: 'pointer'
              }
            }}
          >
            <Box
              component="span"
              sx={{
                marginRight: '12px',
                fontWeight: 'bold',
                color: 'rgba(255, 255, 255, 0.7)'
              }}
            >
              {i + 1}
            </Box>
            <Box component="span" sx={{ flexGrow: 1 }}>
              {log}
            </Box>
          </Typography>
        ))}
    </Box>
  );
};
