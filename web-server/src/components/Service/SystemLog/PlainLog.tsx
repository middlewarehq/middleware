import { Line } from '@/components/Text';

import { SearchHighlightText } from './FormattedLog';

interface PlainLogProps {
  log: string;
  index: number;
  searchQuery?: string;
  isCurrentMatch?: boolean;
}

export const PlainLog = ({ 
  log, 
  searchQuery, 
  isCurrentMatch 
}: PlainLogProps) => {
  return (
    <Line mono marginBottom={1}>
      <SearchHighlightText
        text={log}
        searchQuery={searchQuery}
        isCurrentMatch={isCurrentMatch} 
      />
    </Line>
  );
};
