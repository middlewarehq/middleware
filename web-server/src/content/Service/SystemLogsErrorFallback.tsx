import { CopyAll } from '@mui/icons-material';
import { Button, Typography } from '@mui/material';
import CircularProgress from '@mui/material/CircularProgress';
import { useSnackbar } from 'notistack';
import { useEffect, useRef, useMemo } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { track } from '@/constants/events';
import { ServiceNames } from '@/constants/service';
import { useSelector } from '@/store';

export const SystemLogsErrorFallback = ({
  error,
  serviceName
}: {
  error: Error;
  serviceName: ServiceNames;
}) => {
  const services = useSelector((state) => state.service.services);
  const loading = useSelector((state) => state.service.loading);
  const logs = useMemo(() => {
    return services[serviceName].logs || [];
  }, [serviceName, services]);

  const containerRef = useRef<HTMLDivElement>(null);
  const { enqueueSnackbar } = useSnackbar();
  const errorBody = useMemo(
    () => ({
      message: error?.message?.replace('\\n', '\n'),
      stack: error?.stack?.replace('\\n', '\n')
    }),
    [error?.message, error?.stack]
  );

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs]);

  useEffect(() => {
    track('ERR_FALLBACK_SHOWN', { err: errorBody });
    console.error(error);
  }, [errorBody, error]);

  return (
    <FlexBox col>
      {loading ? (
        <FlexBox alignCenter gap2>
          <CircularProgress size="20px" />
          <Line>Loading...</Line>
        </FlexBox>
      ) : (
        services &&
        logs.map((log, index) => (
          <Line
            key={index}
            marginBottom={'8px'}
            fontSize={'14px'}
            fontFamily={'monospace'}
          >
            {log}
          </Line>
        ))
      )}
      <FlexBox alignCenter gap={1}>
        <Line tiny color="warning.main" fontWeight="bold">
          <Typography variant="h6">
            Something went wrong displaying the logs.
          </Typography>
          An error occurred while processing the logs. Please report this issue.
        </Line>
        <CopyToClipboard
          text={JSON.stringify(errorBody, null, '  ')}
          onCopy={() => {
            enqueueSnackbar(`Error logs copied to clipboard`, {
              variant: 'success'
            });
          }}
        >
          <Button
            size="small"
            variant="contained"
            startIcon={<CopyAll />}
            sx={{ fontWeight: 'bold' }}
          >
            Copy Logs
          </Button>
        </CopyToClipboard>
        <Button
          variant="contained"
          size="small"
          href="https://github.com/middlewarehq/middleware/issues/new/choose"
          target="_blank"
          rel="noopener noreferrer"
        >
          Report Issue
        </Button>
      </FlexBox>
      <FlexBox ref={containerRef} />
    </FlexBox>
  );
};
