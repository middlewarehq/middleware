import { useTheme, alpha } from '@mui/material';

import { FlexBox, FlexBoxProps } from '@/components/FlexBox';
import { Line, LineProps } from '@/components/Text';

export const Section = (p: FlexBoxProps) => <FlexBox col gap={3} {...p} />;
export const DataSection = (p: FlexBoxProps) => <FlexBox gap={2} wrap {...p} />;
export const Header = (p: LineProps) => <Line bold white huge {...p} />;
export const SubHeader = (p: LineProps) => <Line bold white {...p} />;

export const SectionWrapper = ({
  shade,
  ...p
}: FlexBoxProps & { shade: string }) => {
  const theme = useTheme();

  return (
    <FlexBox
      p={1.5}
      gap={2}
      bgcolor={alpha(shade, 0.025)}
      corner={theme.spacing(1)}
      {...p}
    />
  );
};

export const VerticalText = ({
  flat,
  flip,
  ...props
}: FlexBoxProps & { flat?: boolean; flip?: boolean }) => {
  const theme = useTheme();
  return (
    <FlexBox
      px={flat ? undefined : 1}
      py={flat ? undefined : 2}
      corner={flat ? undefined : theme.spacing(1)}
      bgcolor={flat ? undefined : theme.colors.secondary.lighter}
      noShrink
      sx={{
        writingMode: 'vertical-lr',
        transform: flip ? undefined : 'rotate(180deg)'
      }}
      alignSelf="flex-start"
      flexDirection="column-reverse"
      {...props}
    />
  );
};
