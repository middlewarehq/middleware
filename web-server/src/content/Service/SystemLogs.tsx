import { Box, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import { useEffect, useRef, useMemo } from 'react';

import { ServiceNames } from '@/constants/service';
import { ServiceStatusState } from '@/slices/service';
import { useSelector } from '@/store';

export const SystemLogs = () => {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const services = useSelector(
    (state: { service: { services: ServiceStatusState } }) =>
      state.service.services
  );
  const active = useSelector((s) => s.service.active) as ServiceNames;

  const logs = useMemo(() => {
    return active ? services[active]?.logs || [] : [];
  }, [active, services]);

  useEffect(() => {
    if (!active) {
      router.push('/system');
    }
  }, [active, router]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <Box
      ref={containerRef}
      sx={{
        padding: '16px 24px',
        borderRadius: 2,
        overflowY: 'auto',
        maxHeight: '750px',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        lineHeight: 1.6,
        marginTop: '8px'
      }}
    >
      {services &&
        logs.map((log, index) => (
          <Typography
            key={index}
            style={{ marginBottom: '8px', fontFamily: 'monospace' }}
          >
            {log}
          </Typography>
        ))}
    </Box>
  );
};
