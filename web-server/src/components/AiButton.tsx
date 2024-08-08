import { Button, ButtonProps, useTheme } from '@mui/material';
import { FC, useRef } from 'react';
import { SiOpenai } from 'react-icons/si';

import { track } from '@/constants/events';

export const AiButton: FC<ButtonProps & { onClickCallback: () => void }> = ({
  onClickCallback,
  ...props
}) => {
  const theme = useTheme();
  const mouseEnterRef = useRef(null);

  return (
    <Button
      {...props}
      variant="contained"
      size="small"
      onClick={onClickCallback}
      sx={{
        whiteSpace: 'pre',
        position: 'relative',
        background: `linear-gradient(90deg, #2b4584, #4a8648 51%, #2b4584) var(--x, 100%)/ 200%`,
        transition: '0.25s ease',
        ':hover': { '--x': '0%' },
        ...props.sx
      }}
      endIcon={
        <SiOpenai size={theme.spacing(1.8)} style={{ marginRight: '4px' }} />
      }
      onMouseEnter={() => {
        mouseEnterRef.current = setTimeout(
          () => track('AI_MODAL_BTN_LINGER'),
          300
        );
      }}
      onMouseLeave={() => clearTimeout(mouseEnterRef.current)}
    >
      {props.children}
    </Button>
  );
};
