import { HelpOutlineRounded } from '@mui/icons-material';
import Link from 'next/link';
import { ComponentProps, FC } from 'react';
import { GoLinkExternal } from 'react-icons/go';

import { FlexBox, FlexBoxProps } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { OPEN_IN_NEW_TAB_PROPS } from '@/utils/url';

export const MetricExternalRead: FC<
  {
    label: string;
    link: string;
    iconProps?: ComponentProps<typeof HelpOutlineRounded>;
  } & FlexBoxProps
> = ({ label, link, children, iconProps, ...props }) => {
  return (
    <>
      <FlexBox
        color="white"
        title={
          <FlexBox col gap={1 / 2}>
            <Link href={link} {...OPEN_IN_NEW_TAB_PROPS}>
              <Line
                tiny
                sx={{
                  cursor: 'pointer',
                  display: 'flex',
                  whiteSpace: 'pre',
                  alignItems: 'center',
                  gap: 1 / 2
                }}
                underline
                dotted
                medium
                white
              >
                Read more about {label} <GoLinkExternal />
              </Line>
            </Link>
          </FlexBox>
        }
        darkTip
        {...props}
      >
        <HelpOutlineRounded sx={{ fontSize: '1.4em' }} {...iconProps} />
      </FlexBox>
      {children}
    </>
  );
};
