import { Box, useTheme } from '@mui/material';
import PropTypes from 'prop-types';
import { FC, ReactNode } from 'react';
import { ScrollbarProps, Scrollbars } from 'react-custom-scrollbars-2';

type Props = {
  className?: string;
  children?: ReactNode;
} & ScrollbarProps;

const Scrollbar: FC<Props> = ({ children, ...rest }) => {
  const theme = useTheme();

  return (
    <Scrollbars
      autoHide
      universal
      renderThumbHorizontal={() => {
        return (
          <Box
            sx={{
              height: 5,
              background: `${theme.colors.alpha.black[10]}`,
              borderRadius: `${theme.general.borderRadiusLg}`,
              transition: `${theme.transitions.create(['background'])}`,

              '&:hover': {
                background: `${theme.colors.alpha.black[30]}`
              }
            }}
          />
        );
      }}
      renderThumbVertical={() => {
        return (
          <Box
            sx={{
              width: 5,
              background: `${theme.colors.alpha.black[10]}`,
              borderRadius: `${theme.general.borderRadiusLg}`,
              transition: `${theme.transitions.create(['background'])}`,

              '&:hover': {
                background: `${theme.colors.alpha.black[30]}`
              }
            }}
          />
        );
      }}
      {...rest}
    >
      {children}
    </Scrollbars>
  );
};

Scrollbar.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string
};

export default Scrollbar;
