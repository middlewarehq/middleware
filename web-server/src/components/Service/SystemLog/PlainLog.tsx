import { Line } from '@/components/Text';

interface PlainLogProps {
  log: string;
  index: number;
  searchQuery?: string;
}

const HighlightedText = ({ text, searchQuery }: { text: string; searchQuery?: string }) => {
  if (!searchQuery) return <>{text}</>;

  const parts = text.split(new RegExp(`(${searchQuery})`, 'gi'));
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === searchQuery.toLowerCase() ? (
          <span key={i} style={{ backgroundColor: 'yellow', color: 'black' }}>
            {part}
          </span>
        ) : (
          part
        )
      )}
    </>
  );
};

export const PlainLog = ({ log, searchQuery }: PlainLogProps) => {
  return (
    <Line mono marginBottom={1}>
      <HighlightedText text={log} searchQuery={searchQuery} />
    </Line>
  );
};
