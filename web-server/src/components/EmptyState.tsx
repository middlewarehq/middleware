import { Card } from '@mui/material';
import { AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/router';
import { FC, ReactNode, useEffect, useMemo } from 'react';

import EmptyStateSvg from '@/assets/empty-state.svg';
import { FlexBox, FlexBoxProps } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { track } from '@/constants/events';
import { OPEN_IN_NEW_TAB_PROPS } from '@/utils/url';

import { MotionBox } from './MotionComponents';

type Props = {
  title?: ReactNode;
  desc?: ReactNode;
  type?: string;
  noImage?: boolean;
};
type EmptyStateProps = Props & Omit<FlexBoxProps, keyof Props>;

export const EmptyState: FC<EmptyStateProps> = ({
  title,
  desc,
  children,
  noImage,
  type = 'Unspecified',
  ...props
}) => {
  const { mailtoLink } = useDebug(
    'No data in app',
    'Hi, I am not seeing any data in the app, but I think I should be seeing something here.'
  );

  useEffect(() => {
    track('EMPTY_STATE_VIEWED', { type });
  }, [type]);

  return (
    <AnimatePresence>
      <MotionBox
        initial={{ y: '40px', opacity: 0 }}
        animate={{ y: '0px', opacity: 1 }}
        exit={{ y: '40px', opacity: 0 }}
      >
        <FlexBox
          width="340px"
          col
          centered
          gap1
          component={Card}
          p={2}
          pb={3}
          textAlign="center"
          {...props}
        >
          {!noImage && <EmptyStateSvg />}
          <Line white bold big>
            {title || 'We came up with... nothing!'}
          </Line>
          <Line>{desc || "There's no data to see here"}</Line>
          {children}
          <Line tiny mt={2}>
            If you think this shouldn't be the case, reach out to us using the{' '}
            <Line
              underline
              component={FlexBox}
              title={
                <FlexBox col>
                  <Line color="black" bold>
                    You should see it in the bottom right corner of the window.
                  </Line>
                  <Line color="black" tiny>
                    In case you don't, your adblocker may have blocked it, and
                    you can use the "contact us" link
                  </Line>
                </FlexBox>
              }
            >
              help widget
            </Line>
            , or{' '}
            <a
              color="inherit"
              {...OPEN_IN_NEW_TAB_PROPS}
              onClick={(e) => {
                track('EMPTY_STATE_CONTACT_CLICK');
                e.stopPropagation();
              }}
              href={mailtoLink}
            >
              <Line color="info" bold underline>
                click here to contact us
              </Line>
            </a>
          </Line>
        </FlexBox>
      </MotionBox>
    </AnimatePresence>
  );
};

export const useDebug = (
  error = 'Something went wrong',
  desc = '<<Enter error description>>'
) => {
  const router = useRouter();

  const debugData = useMemo(
    () =>
      Object.entries({
        Page: router.asPath,
        'Time of error': new Date().toString(),
        Environment: process.env.NEXT_PUBLIC_APP_ENVIRONMENT
      })
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n'),
    [router.asPath]
  );

  const details = useMemo(
    () =>
      `${
        typeof desc === 'string' ? desc : JSON.stringify(desc)
      }\n\n\nDEBUG DATA:\n\n${debugData}`,
    [debugData, desc]
  );

  const mailtoLink = getMailtoLink(error, details.replaceAll('\n', '%0A'));

  return { details, debugData, mailtoLink };
};

export const getMailtoLink = (subject: string, body: string) =>
  `mailto:contact@middlewarehq.com?cc=dhruv@middlewarehq.com,jayant@middlewarehq.com&subject=${subject}&body=<Add details/screenshots here>%0A${body}`;
