import { CopyAll } from '@mui/icons-material';
import { Button, Typography } from '@mui/material';
import { useSnackbar } from 'notistack';
import CopyToClipboard from 'react-copy-to-clipboard';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';

export const SystemLogErrorMessage = ({ errorBody }: { errorBody: any }) => {
  const { enqueueSnackbar } = useSnackbar();
  return (
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
  );
};
