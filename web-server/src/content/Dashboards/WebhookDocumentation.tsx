import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import { Divider, List, ListItem, ListItemText, useTheme } from '@mui/material';
import { Typography } from '@mui/material';
import { Box } from '@mui/material';
import { FC, ReactNode, useState } from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';

type requestBodyField = {
  primaryText: string;
  secondaryText: string | ReactNode;
};

export type WebhookDocumentationProps = {
  title: string;
  description: string;
  endpoint: string;
  requestBody: Record<string, any>;
  requestBodyFields: requestBodyField[];
};

export const WebhookDocumentation: FC<WebhookDocumentationProps> = ({
  title,
  description,
  endpoint,
  requestBody,
  requestBodyFields
}) => {
  return (
    <Box>
      <Line fontSize={24} mb={1}>
        {title}
      </Line>
      <Typography paragraph>{description}</Typography>

      <Divider sx={{ my: 2 }} />

      <Box>
        <Typography variant="h4" mb={2}>
          Endpoint
        </Typography>
        <Line fontSize="medium">POST</Line>
        <CopyTextComponent text={endpoint} />
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box>
        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          Headers
        </Typography>
        <FlexBox flexDirection="column" mb={2}>
          <Line big>
            Content-Type: <Line color="lightgreen">application/json</Line>
          </Line>
          <Line big>
            X-API-KEY: <Line color="lightgreen">{'<Your_API_Key>'}</Line>
          </Line>
        </FlexBox>
        <Line big>
          Replace <Line color="lightgreen">&lt;Your_API_Key&gt;</Line> with the
          actual API key you generated.
        </Line>
      </Box>

      <Divider sx={{ my: 2 }} />

      <Box>
        <Typography variant="h6" gutterBottom>
          Request Body
        </Typography>
        <Typography paragraph>
          The request body should be a JSON object with the following structure:
        </Typography>
        <CopyTextComponent text={JSON.stringify(requestBody, null, 2)} />

        <List dense>
          {requestBodyFields.map((field) => (
            <ListItem key={field.primaryText}>
              <ListItemText
                primary={field.primaryText}
                secondary={field.secondaryText}
                primaryTypographyProps={{ fontSize: 'medium' }}
                secondaryTypographyProps={{ fontSize: 'medium' }}
              />
            </ListItem>
          ))}
        </List>
      </Box>
    </Box>
  );
};

export const CopyTextComponent: FC<{ text: string }> = ({ text }) => {
  const theme = useTheme();
  const [isCopied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  return (
    <FlexBox
      fullWidth
      justifyBetween
      p={2}
      sx={{
        backgroundColor: 'rgba(255, 255, 255, 0.04)',
        borderRadius: theme.spacing(1)
      }}
      mt={theme.spacing(2 / 3)}
    >
      <Box component="pre" margin={0}>
        {text}
      </Box>
      <CopyToClipboard text={text} onCopy={handleCopy}>
        <div
          style={{
            cursor: 'pointer',
            position: 'relative',
            width: '24px',
            height: '24px'
          }}
        >
          <CheckCircleRoundedIcon
            fontSize="small"
            sx={{
              position: 'absolute',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              color: theme.palette.success.main,
              opacity: isCopied ? 1 : 0,
              transform: isCopied
                ? 'scale(1) translateY(0)'
                : 'scale(0.8) translateY(10px)',
              pointerEvents: isCopied ? 'auto' : 'none'
            }}
          />
          <ContentCopyRoundedIcon
            fontSize="small"
            sx={{
              position: 'absolute',
              transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
              opacity: isCopied ? 0 : 1,
              transform: isCopied
                ? 'scale(0.8) translateY(-10px)'
                : 'scale(1) translateY(0)',
              pointerEvents: isCopied ? 'none' : 'auto',
              '&:hover': {
                transform: 'scale(1.1)',
                color: theme.palette.primary.main
              }
            }}
          />
        </div>
      </CopyToClipboard>
    </FlexBox>
  );
};
