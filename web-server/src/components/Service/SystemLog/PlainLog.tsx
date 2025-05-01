import { Line } from '@/components/Text';

import { HighlightedText } from './FormattedLog';

interface PlainLogProps {
  log: string;
  index: number;
  searchQuery?: string;
  isCurrentMatch?: boolean;
}

export const PlainLog = ({ log, searchQuery, isCurrentMatch }: PlainLogProps) => {
  return (
    <Line mono marginBottom={1}>
      <HighlightedText text={log} searchQuery={searchQuery} isCurrentMatch={isCurrentMatch} />
    </Line>
  );
};
