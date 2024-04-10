import ErrorOutlineRoundedIcon from '@mui/icons-material/ErrorOutlineRounded';
import { Button } from '@mui/material';
import Link from 'next/link';
import { FC, useMemo } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { track } from '@/constants/events';
import { ROUTES } from '@/constants/routes';

export const MissingDORAProviderLink: FC<{
  type: 'CODE' | 'INCIDENT' | 'DEPLOYMENT';
  hideErrorIcon?: boolean;
}> = ({ type, hideErrorIcon }) => {
  const integrationName = useMemo(() => {
    const typeString = type.slice(0).toLowerCase();
    return typeString.charAt(0).toUpperCase() + typeString.slice(1);
  }, [type]);

  const title = `No ${integrationName} Provider Linked`;
  const buttonLabel = `Connect ${integrationName} Provider`;

  return (
    <FlexBox gap1 col>
      {!hideErrorIcon && (
        <ErrorOutlineRoundedIcon fontSize="large" color="warning" />
      )}
      <Line big>{title}</Line>
      <Link passHref href={ROUTES.INTEGRATIONS.PATH}>
        <Button
          variant="contained"
          size="small"
          onClick={() =>
            track('NAVIGATED_TO_INTEGRATIONS_FROM_MISSING_DORA_LINK', {
              provider_type: type
            })
          }
        >
          {buttonLabel}
        </Button>
      </Link>
    </FlexBox>
  );
};
