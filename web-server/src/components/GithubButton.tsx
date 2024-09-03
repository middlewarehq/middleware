import { GitHub } from '@mui/icons-material';
import {
  Button,
  ButtonProps,
  Divider,
  Typography,
  useTheme
} from '@mui/material';
import { FC, useCallback, useEffect } from 'react';
import { FlexBox } from './FlexBox';
import { useEasyState } from '@/hooks/useEasyState';
import { handleApi } from '@/api-helpers/axios-api-instance';

const githubRepoUrl = `https://github.com/middlewarehq/middleware`;

type GithubStarsAPIResponse = {
  stargazers_count: number;
};

export const GithubButton: FC<ButtonProps> = () => {
  const theme = useTheme();
  const starsCount = useEasyState<string>('');

  const formatStarCount = useCallback((stars: number) => {
    if (stars < 1000) return `${stars}`;

    let digit = `${(stars / 1000).toFixed(1)}`;
    if (digit.endsWith('0')) digit = digit.slice(0, -2);

    return `${digit}k`;
  }, []);

  useEffect(() => {
    handleApi('/internal/github_stars').then((res: GithubStarsAPIResponse) => {
      const formattedCount = formatStarCount(res.stargazers_count);
      starsCount.set(formattedCount);
    });
  }, []);

  return (
    <Button
      variant="outlined"
      sx={{
        borderRadius: '6px',
        borderWidth: '1px',
        borderColor: theme.colors.alpha.trueWhite[10],
        color: 'lightgray',
        height: '40px',
        display: 'flex',
        padding: 0
      }}
      onClick={() => window.open(githubRepoUrl, '_blank')}
    >
      <FlexBox marginX={2}>
        <GitHub fontSize="small" />
        <Typography fontWeight="bold" marginLeft={0.5}>
          Star
        </Typography>
      </FlexBox>

      <Divider
        orientation="vertical"
        sx={{
          height: '100%',
          width: '1px',
          borderColor: theme.colors.alpha.trueWhite[10],
        }}
      />

      <Typography marginX={2} fontWeight="bold">
        {starsCount.value}
      </Typography>
    </Button>
  );
};
