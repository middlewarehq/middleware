import { useMemo } from 'react';

import { ServiceNames } from '@/constants/service';
import { useSelector } from '@/store';
export const useSystemLogs = ({
  serviceName
}: {
  serviceName?: ServiceNames;
}) => {
  const services = useSelector((state) => state.service.services);
  const loading = useSelector((state) => state.service.loading);
  const logs = useMemo(
    () => services[serviceName]?.logs || [],
    [serviceName, services]
  );

  return {
    services,
    loading,
    logs
  };
};
