import { Line } from '@/components/Text';

export const PlainLog = ({ log, index }: { log: string; index: number }) => {
  return (
    <Line
      key={index}
      marginBottom={'8px'}
      fontSize={'14px'}
      fontFamily={'monospace'}
    >
      {log}
    </Line>
  );
};
