import { Line } from '@/components/Text';

import { HighlightedText } from './FormattedLog';
interface PlainLogProps {
  log: string;
  index: number;
  searchQuery?: string;
}

export const PlainLog = ({ log, searchQuery }: PlainLogProps) => {
  return (
    <Line mono marginBottom={1}>
      <HighlightedText text={log} searchQuery={searchQuery} />
    </Line>
  );
};
