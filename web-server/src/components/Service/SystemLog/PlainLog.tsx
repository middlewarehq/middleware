import { Line } from '@/components/Text';

export const PlainLog = ({ log }: { log: string; index: number }) => {
  return (
    <Line mono marginBottom={1}>
      {log}
    </Line>
  );
};
