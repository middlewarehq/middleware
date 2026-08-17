import CheckCircleOutlineRoundedIcon from '@mui/icons-material/CheckCircleOutlineRounded';
import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { alpha, Paper, useTheme } from '@mui/material';
import Img from 'next/image';

import { FlexBox, FlexBoxProps } from '@/components/FlexBox';
import { Line } from '@/components/Text';

export const CardRoot = (props: FlexBoxProps) => (
  <FlexBox
    sx={{
      cursor: 'pointer',
      '&:hover': {
        filter: 'brightness(1.3)',
        transition: 'all 0.3s'
      }
    }}
    component={Paper}
    col
    relative
    width={'100%'}
    flexGrow={1}
    overflow={'hidden'}
    height={'100%'}
    {...props}
  />
);

export const NoDataImg = () => {
  const theme = useTheme();
  return (
    <Img
      src="/static/images/placeholders/illustrations/no-data.svg"
      alt="no-data"
      height="200"
      width="200"
      style={{
        position: 'absolute',
        top: theme.spacing(-5),
        right: theme.spacing(2),
        opacity: 0.75
      }}
    />
  );
};

// CLUSTOX: the benchmark verdict as a pill rather than a small text line. The
// plain line was easy to miss beside the gold classification chip; the pill
// puts the two judgements at equal visual weight -- industry rating on the
// right of the header, your own target here. Gap leads ("43% under target"),
// source trails, and the full sentence with both raw values lives in the
// hover tooltip, so the glanceable form and the exact form are both there.
//
// Tones stay success/warning -- never red. A missed internal goal is not an
// error, and a red chip would read as one.
export const BenchmarkVerdictPill = ({
  caption
}: {
  caption: {
    text: string;
    headline: string;
    sourceShort: string;
    tone: 'good' | 'warn';
  };
}) => {
  const theme = useTheme();
  const tone =
    caption.tone === 'good'
      ? theme.colors.success.main
      : theme.colors.warning.main;
  return (
    <FlexBox paddingX={2} mt={-1}>
      <FlexBox
        alignCenter
        gap={1 / 2}
        title={caption.text}
        darkTip
        sx={{
          backgroundColor: alpha(tone, 0.14),
          borderRadius: '14px',
          padding: '2px 10px',
          width: 'fit-content'
        }}
      >
        {caption.tone === 'good' ? (
          <CheckCircleOutlineRoundedIcon
            sx={{ fontSize: '1em', color: tone }}
          />
        ) : (
          <ErrorOutlineRoundedIcon sx={{ fontSize: '1em', color: tone }} />
        )}
        <Line small bold sx={{ color: tone }}>
          {caption.headline}
        </Line>
        <Line small secondary>
          · {caption.sourceShort}
        </Line>
      </FlexBox>
    </FlexBox>
  );
};
