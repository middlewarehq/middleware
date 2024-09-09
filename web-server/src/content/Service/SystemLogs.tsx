import { Card } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useEffect, useRef, useMemo } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { serviceColor } from '@/components/Service/SystemStatus';
import { Line } from '@/components/Text';
import { ServiceNames } from '@/constants/service';
import { useSelector } from '@/store';

export const SystemLogs = ({ serviceName }: { serviceName: ServiceNames }) => {
  const services = useSelector((state) => state.service.services);
  const loading = useSelector((state) => state.service.loading);
  const logs = useMemo(() => {
    return services[serviceName].logs || [];
  }, [serviceName, services]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <FlexBox ref={containerRef} col>
      {loading ? (
        <FlexBox alignCenter gap2>
          <CircularProgress size="20px" />
          <Line>Loading...</Line>
        </FlexBox>
      ) : (
        <FlexBox
          component={Card}
          p={1}
          px={1.5}
          col
          boxShadow={null}
          border={'1px solid'}
          borderColor={serviceColor[serviceName]}
        >
          {services &&
            logs.map((log, index) => (
              <Line
                key={index}
                marginBottom={'8px'}
                fontSize={'14px'}
                fontFamily={'monospace'}
              >
                {log}
              </Line>
            ))}
        </FlexBox>
      )}
    </FlexBox>
  );
};
