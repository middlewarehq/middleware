import { showNewMessage } from '@intercom/messenger-js-sdk';
import { Button, Card, Link } from '@mui/material';
import { useRouter } from 'next/router';
import { FC, useEffect, useMemo } from 'react';

import { track } from '@/constants/events';
import { useAuth } from '@/hooks/useAuth';

import Error from './error.svg';

import errPattern from '../ErrorBoundaryFallback/err-pattern.png';
import { FlexBox } from '../FlexBox';
import { Line } from '../Text';

const helpdeskPrefill = (error: string, details: string) => {
  if (typeof window === 'undefined') return;
  try {
    showNewMessage(`${error}\n\n${details}`);
  } catch (err) {
    console.warn('Failed to show Intercom message:', err);
  }
};

export const useHelpdeskPrefill = (error: string, details: string) => {
  useEffect(() => {
    helpdeskPrefill(error, details);
  }, [details, error]);
};

export const useDebug = (
  error = 'Something went wrong',
  desc = '<<Enter error description>>'
) => {
  const router = useRouter();
  const { org } = useAuth();

  const debugData = useMemo(
    () =>
      Object.entries({
        Page: router.asPath,
        'Current Org': `${org?.name} - ${org?.domain}`,
        'Current Org ID': `${org?.id}`,
        'Time of error': new Date().toString(),
        Environment: process.env.NEXT_PUBLIC_APP_ENVIRONMENT
      })
        .map(([key, value]) => `${key}: ${value}`)
        .join('\n'),
    [router.asPath, org?.name, org?.domain, org?.id]
  );

  const details = useMemo(
    () =>
      `${
        typeof desc === 'string' ? desc : JSON.stringify(desc)
      }\n\n\nDEBUG DATA:\n\n${debugData}`,
    [debugData, desc]
  );

  useHelpdeskPrefill(error, details);

  const mailtoLink = getMailtoLink(error, details.replaceAll('\n', '%0A'));

  return { details, debugData, mailtoLink };
};

export const SomethingWentWrong: FC<{ error?: string; desc?: string }> = ({
  error = 'Something went wrong',
  desc = '<<Enter error description>>',
  children
}) => {
  const { mailtoLink } = useDebug(error, desc);

  useEffect(() => {
    track('SOMETHING_WENT_WRONG', { meta: { error, desc } });
  }, [desc, error]);

  return (
    <Card
      component={Card}
      sx={{
        backgroundImage: `url(${errPattern})`,
        backgroundSize: '250px',
        position: 'relative',
        maxWidth: '500px',
        m: '2px'
      }}
    >
      <FlexBox bgfy bgcolor="#0003" sx={{ backdropFilter: 'blur(2px)' }} />
      <FlexBox relative col centered p={4} gap1 textAlign="center">
        <Error width="300px" />
        <Line huge bold mt={1} white>
          {error}
        </Line>
        <Line>{desc ?? "We'll fix it shortly"}</Line>
        {children ? (
          <FlexBox col p={1}>
            {children}
          </FlexBox>
        ) : null}
        <Line bigish semibold mt={3}>
          Feel free to reach out to us
        </Line>
        <Button component={Link} href={mailtoLink} size="small" target="_blank">
          Click here to send an email
        </Button>
        <Line mt={-1}>or</Line>
        <Button
          onClick={() => window.location.reload()}
          size="small"
          color="secondary"
          variant="outlined"
        >
          Click here to reload
        </Button>
      </FlexBox>
    </Card>
  );
};

export const getMailtoLink = (subject: string, body: string) =>
  `mailto:contact@middlewarehq.com?cc=dhruv@middlewarehq.com,jayant@middlewarehq.com&subject=${subject}&body=<Add details/screenshots here>%0A${body}`;
