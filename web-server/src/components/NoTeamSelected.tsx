import { Box, Button, Typography } from '@mui/material';
import Link from 'next/link';
import { FC } from 'react';

import NoTeamSelectedSvg from '@/assets/no-team-selected.svg';
import { ROUTES } from '@/constants/routes';

export const NoTeamSelected: FC = () => {
  return (
    <Box
      width="100%"
      display="flex"
      alignItems="center"
      justifyContent="center"
      flexDirection="column"
    >
      <NoTeamSelectedSvg width="300px" style={{ maxWidth: '40%' }} />
      <Typography variant="h4" mb={2}>
        Select a team to get started
      </Typography>
      <Typography variant="h5" color="secondary.dark">
        Want to create a new one?
      </Typography>
      <Link href={ROUTES.TEAMS.ROUTE.PATH} passHref>
        <Button variant="text" size="small">
          Go here
        </Button>
      </Link>
    </Box>
  );
};
