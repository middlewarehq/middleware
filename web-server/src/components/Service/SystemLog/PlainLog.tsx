import { Line } from '@/components/Text';

export const PlainLog = ({ log }: { log: string; index: number }) => {
  return (
    <Line medium marginBottom={'8px'} fontFamily={'monospace'}>
      {log}
    </Line>
  );
};
