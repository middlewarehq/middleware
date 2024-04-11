import { Box } from '@mui/material';
import { BoxProps } from '@mui/system';
import PropTypes from 'prop-types';
import { FC } from 'react';

const DefaultPageTitleWrapper: FC<BoxProps> = ({ children, ...props }) => {
  return (
    <Box
      className="MuiPageTitle-wrapper"
      p={4}
      py={{ lg: 4, xs: 2 }}
      {...props}
    >
      {children}
    </Box>
  );
};

DefaultPageTitleWrapper.propTypes = {
  children: PropTypes.node.isRequired
};

export default DefaultPageTitleWrapper;

export const PageTitleWrapper: FC<BoxProps> = ({ children, ...props }) => {
  return (
    <Box
      className="MuiPageTitle-wrapper"
      {...props}
      p={4}
      py={{ lg: 2.5, xs: 2 }}
      sx={{ ...props.sx, marginBottom: `0 !important` }}
    >
      {children}
    </Box>
  );
};
