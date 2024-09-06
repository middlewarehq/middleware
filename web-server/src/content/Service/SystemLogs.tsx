import { Box, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import { useEffect, useRef, useMemo } from 'react';

import { ServiceNames } from '@/constants/service';
import { useSelector } from '@/store';

export const SystemLogs = ({ serviceName }: { serviceName: ServiceNames }) => {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const services = useSelector((state) => state.service.services);
  const logs = useMemo(() => {
    return serviceName ? services[serviceName]?.logs || [] : [];
  }, [serviceName, services]);

  useEffect(() => {
    if (!serviceName) {
      router.push('/system');
    }
  }, [serviceName, router]);

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
        logs.map((log, index) => {
          return (
            <Typography
              key={index}
              style={{
                marginBottom: '8px',
                fontFamily: 'monospace',
                padding: '2px'
              }}
            >
              {log}
            </Typography>
          );
        })}
    </Box>
  );
};
