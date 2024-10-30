import React from 'react';

import { Line } from '@/components/Text';

export const PlainLog = ({
  log,
  style
}: {
  log: string;
  index: number;
  style?: React.CSSProperties;
}) => {
  return (
    <Line mono marginBottom={1} style={style}>
      {log}
    </Line>
  );
};
