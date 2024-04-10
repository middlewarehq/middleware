import { Box, BoxProps } from '@mui/material';
import { OverridableComponent } from '@mui/material/OverridableComponent';
import { styled } from '@mui/material/styles';
import { BoxTypeMap } from '@mui/system';
import clsx from 'clsx';
import { ComponentProps, forwardRef } from 'react';

import { merge } from '@/utils/datatype';

type TextProps = {
  color?:
    | 'primary'
    | 'secondary'
    | 'error'
    | 'warning'
    | 'success'
    | 'info'
    | 'black'
    | BoxProps['color'];
  isFlex?: boolean;
  thick?: boolean;
  bold?: boolean;
  semibold?: boolean;
  medium?: boolean;
  regular?: boolean;
  bigish?: boolean;
  big?: boolean;
  huge?: boolean;
  small?: boolean;
  tiny?: boolean;
  white?: boolean;
  info?: boolean;
  warning?: boolean;
  primary?: boolean;
  success?: boolean;
  secondary?: boolean;
  error?: boolean;
  italic?: boolean;
  underline?: boolean;
  dotted?: boolean;
  mono?: boolean;
  hideIfEmpty?: boolean;
  pointer?: boolean;
  clip?: boolean;
  noWrap?: boolean;
};

const TextWrapper = styled(Box)(
  () => `
      align-items: center;
      text-decoration: inherit;
      text-decoration-style: inherit

      &.flexItem {
        display: inline-flex;
      }

      &.text_style_italic {
        font-style: italic;
      }

      &.text_style_mono {
        font-family: monospace;
      }

      &.text_style_underline {
        text-decoration: underline;
      }

      &.text_style_dotted {
        text-decoration-style: dotted;
      }

      &.hide_if_empty:empty {
        display: none;
      }
`
);

export const Text: OverridableComponent<BoxTypeMap<TextProps, 'div'>> =
  forwardRef(
    (
      {
        isFlex,
        thick,
        bold,
        semibold,
        medium,
        regular,
        huge,
        big,
        small,
        tiny,
        white,
        italic,
        underline,
        mono,
        dotted,
        hideIfEmpty,
        pointer,
        clip,
        info,
        warning,
        success,
        error,
        primary,
        secondary,
        bigish,
        noWrap,
        ...rest
      },
      ref
    ) => {
      return (
        <TextWrapper
          ref={ref}
          className={clsx('LineComponent', {
            flexItem: isFlex,
            text_style_italic: italic,
            text_style_underline: underline,
            text_style_dotted: dotted,
            text_style_mono: mono,
            hide_if_empty: hideIfEmpty
          })}
          display="inline-block"
          {...rest}
          sx={merge(
            rest.sx,
            { color: rest.color ? `${rest.color}.main` : 'inherit' },
            pointer && { cursor: 'pointer' },
            noWrap && { whiteSpace: 'nowrap' },
            clip && {
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis'
            },
            info && { color: 'info.main' },
            warning && { color: 'warning.main' },
            success && { color: 'success.main' },
            error && { color: 'error.main' },
            primary && { color: 'primary.main' },
            secondary && { color: 'secondary.main' },
            white && { color: 'white' },
            regular && { fontWeight: 400 },
            medium && { fontWeight: 500 },
            semibold && { fontWeight: 600 },
            bold && { fontWeight: 700 },
            thick && { fontWeight: 900 },
            huge && { fontSize: '1.4em' },
            big && { fontSize: '1.2em' },
            bigish && { fontSize: '1.1em' },
            small && { fontSize: 'small' },
            tiny && { fontSize: 'smaller' }
          )}
        />
      );
    }
  );

export type LineProps = ComponentProps<typeof Text>;

export const Line = Text;

export default Text;
