import { Box, Typography } from '@mui/material';
import { useRouter } from 'next/router';
import { useEffect, useRef, useMemo } from 'react';

import { ServiceNames } from '@/constants/service';
import { useSelector } from '@/store';

const getColorTheme = (serviceName: ServiceNames): [string, string] => {
  switch (serviceName) {
    case ServiceNames.API_SERVER:
      return ['api', '#06d6a0'];
    case ServiceNames.SYNC_SERVER:
      return ['snc', '#ab34eb'];
    case ServiceNames.REDIS:
      return ['rdi', '#ef476f'];
    case ServiceNames.POSTGRES:
      return ['pgs', '#ff70a6'];
    default:
      return ['', '#000000'];
  }
};

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
          const [code, color] = getColorTheme(serviceName);
          return (
            <Typography
              key={index}
              style={{
                marginBottom: '8px',
                fontFamily: 'monospace',
                border: `0.2px solid ${color}`,
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
