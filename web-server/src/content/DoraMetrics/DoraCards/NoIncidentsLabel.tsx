import { FC } from 'react';

import { Line } from '@/components/Text';

export const NoIncidentsLabel: FC<{ deploymentsCount?: number }> = ({
  deploymentsCount
}) => (deploymentsCount ? <Line>No incidents</Line> : <Line>No CFR data</Line>);
