import { Box, BoxProps, TooltipProps, useTheme } from '@mui/material';
import { OverridableComponent } from '@mui/material/OverridableComponent';
import { BoxTypeMap } from '@mui/system';
import Link from 'next/link';
import {
  ComponentProps,
  CSSProperties,
  forwardRef,
  memo,
  ReactNode,
  useMemo
} from 'react';

import { OPEN_IN_NEW_TAB_PROPS } from '@/utils/url';

import { DarkTooltip, LightTooltip } from './Shared';

type CustomProps = {
  /** alignItems: center; justifyContent: center */
  centered?: boolean;
  alignCenter?: boolean;
  alignStart?: boolean;
  alignEnd?: boolean;
  alignBase?: boolean;
  justifyCenter?: boolean;
  justifyBetween?: boolean;
  justifyAround?: boolean;
  justifyEnd?: boolean;
  col?: boolean;
  /** display: grid */
  grid?: boolean;
  /** grid cols; needs `grid` */
  cols?: number | string;
  /** grid rows; needs `grid` */
  rows?: number | string;
  /** gridArea name */
  area?: string;
  noShrink?: boolean;
  /** absolute, + t/b/l/r = 0, can work with `fixed` */
  bgfy?: boolean;
  relative?: boolean;
  /** borderRadius, adds `overflow: hidden` */
  corner?: number | string;
  gap1?: boolean;
  gap2?: boolean;
  flex1?: boolean;
  wrap?: boolean;
  /** height/width = 'fit-content */
  fit?: boolean;
  fill?: boolean;
  /** fully rounded corners; circle for squares, pill-like for rectangles */
  round?: boolean;
  /** Default arrow cursor */
  arrow?: boolean;
  /** Index finger pointing cursor */
  pointer?: boolean;
  /** tooltip, default white bg, dark bg with `darkTip` */
  title?: ReactNode;
  /** dark tooltip bg */
  darkTip?: boolean;
  tooltipPlacement?: TooltipProps['placement'];
  tooltipNoArrow?: boolean;
  fullWidth?: boolean;
  inline?: boolean;
  /** wraps component in a next/link */
  link?: string;
  /** open link in new tab, must also pass `link` prop */
  openInNewTab?: boolean;
  hideIfEmpty?: boolean;
  /** Throw an error when rendering this component, **_for testing purposes_** */
  DANGEROUS__INTENTIONAL_CRASH?: boolean;
};

export const FlexBox: OverridableComponent<BoxTypeMap<CustomProps, 'div'>> =
  memo(
    forwardRef(
      (
        {
          centered,
          bgfy,
          corner,
          fit,
          fill,
          relative,
          alignCenter,
          alignStart,
          alignEnd,
          alignBase,
          justifyCenter,
          justifyBetween,
          justifyAround,
          justifyEnd,
          col,
          grid,
          cols,
          rows,
          area,
          noShrink,
          gap1,
          gap2,
          flex1,
          wrap,
          round,
          arrow,
          pointer,
          title,
          tooltipPlacement,
          fullWidth,
          inline,
          link,
          openInNewTab,
          darkTip,
          tooltipNoArrow,
          hideIfEmpty,
          DANGEROUS__INTENTIONAL_CRASH,
          ...props
        }: CustomProps,
        ref
      ) => {
        const theme = useTheme();

        const flexProps = useMemo((): BoxProps => {
          const css: CSSProperties = {};
          if (centered) {
            css.alignItems = 'center';
            css.justifyContent = 'center';
          }
          if (bgfy) {
            // @ts-ignore
            css.position = props.position === 'fixed' ? 'fixed' : 'absolute';
            css.top = 0;
            css.left = 0;
            css.right = 0;
            css.bottom = 0;
            css.margin = 'auto';
          }
          if (corner) {
            css.borderRadius = corner;
            css.overflow = 'hidden';
          }
          if (fit) {
            css.height = 'fit-content';
            css.width = 'fit-content';
          }
          if (fill) {
            css.height = '100%';
            css.width = '100%';
          }

          if (cols && grid) {
            if (typeof cols === 'number')
              css.gridTemplateColumns = `repeat(${cols}, 1fr)`;
            else css.gridTemplateColumns = cols;
          } else if (cols && !grid)
            console.warn('Prop `cols` supplied without `grid`. Needs `grid`.');

          if (rows && grid) {
            if (typeof rows === 'number')
              css.gridTemplateRows = `repeat(${rows}, 1fr)`;
            else css.gridTemplateRows = rows;
          } else if (rows && !grid)
            console.warn('Prop `rows` supplied without `grid`. Needs `grid`.');

          if (grid) css.display = 'grid';
          if (area) css.gridArea = area;
          if (relative) css.position = 'relative';
          if (alignCenter) css.alignItems = 'center';
          if (alignStart) css.alignItems = 'flex-start';
          if (alignEnd) css.alignItems = 'flex-end';
          if (alignBase) css.alignItems = 'baseline';
          if (justifyCenter) css.justifyContent = 'center';
          if (justifyBetween) css.justifyContent = 'space-between';
          if (justifyAround) css.justifyContent = 'space-around';
          if (justifyEnd) css.justifyContent = 'end';
          if (col) css.flexDirection = 'column';
          if (noShrink) css.flexShrink = '0';
          if (gap1) css.gap = theme.spacing(1);
          if (gap2) css.gap = theme.spacing(2);
          if (flex1) css.flex = 1;
          if (wrap) css.flexWrap = 'wrap';
          if (round) css.borderRadius = '1000vw';
          if (arrow) css.cursor = 'default';
          if (pointer) css.cursor = 'pointer';
          if (fullWidth) css.width = '100%';
          if (inline) css.display = 'inline-flex';

          // @ts-ignore
          return { style: { ...css, ...props.style } };
        }, [
          centered,
          bgfy,
          corner,
          fit,
          fill,
          cols,
          grid,
          rows,
          area,
          relative,
          alignCenter,
          alignStart,
          alignEnd,
          alignBase,
          justifyCenter,
          justifyBetween,
          justifyAround,
          justifyEnd,
          col,
          noShrink,
          gap1,
          gap2,
          theme,
          flex1,
          wrap,
          round,
          arrow,
          pointer,
          fullWidth,
          inline,
          // @ts-ignore
          props.position,
          // @ts-ignore
          props.style
        ]);

        if (
          DANGEROUS__INTENTIONAL_CRASH &&
          process.env.NEXT_PUBLIC_APP_ENVIRONMENT !== 'production'
        )
          throw new Error('THIS IS AN INTENTIONAL CRASH');

        let core = (
          <Box
            ref={ref}
            display="flex"
            {...flexProps}
            {...props}
            sx={{
              ...(props as FlexBoxProps).sx,
              ':empty': hideIfEmpty ? { display: 'none' } : {}
            }}
            tabIndex={link ? 0 : undefined}
          />
        );

        if (title)
          core = darkTip ? (
            <DarkTooltip
              title={title}
              placement={tooltipPlacement}
              arrow={!tooltipNoArrow}
            >
              {core}
            </DarkTooltip>
          ) : (
            <LightTooltip
              title={title}
              placement={tooltipPlacement}
              arrow={!tooltipNoArrow}
            >
              {core}
            </LightTooltip>
          );

        if (openInNewTab && !link)
          console.warn(
            '`openInNewTab` supplied without a `link`. Please supply `link`.'
          );

        if (link)
          core = (
            <Link
              passHref
              href={link}
              target={openInNewTab ? OPEN_IN_NEW_TAB_PROPS.target : undefined}
              rel={openInNewTab ? OPEN_IN_NEW_TAB_PROPS.rel : undefined}
              as={link}
              tabIndex={-1}
            >
              {core}
            </Link>
          );

        return core;
      }
    )
  );

export type FlexBoxProps = ComponentProps<typeof FlexBox>;
