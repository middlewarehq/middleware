import StarBorderOutlined from '@mui/icons-material/StarBorderOutlined';
import { Button, ButtonProps, Divider, useTheme } from '@mui/material';
import { FC, useMemo } from 'react';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { useSelector } from '@/store';

const githubRepoUrl = `https://github.com/middlewarehq/middleware`;

const formatStarCount = (stars: number) => {
  if (isNaN(stars)) return '';
  if (stars < 1000) return `${stars}`;

  let digit = `${(stars / 1000).toFixed(1)}`;
  if (digit.endsWith('0')) digit = digit.slice(0, -2);

  return `${digit}k`;
};

export const GithubButton: FC<ButtonProps> = () => {
  const theme = useTheme();
  const githubRepoStars = useSelector((s) => s.app.githubRepoStarsCount);
  const githubRepoStarsCount = useMemo(
    () => formatStarCount(githubRepoStars),
    [githubRepoStars]
  );

  return (
    <Button
      variant="outlined"
      sx={{
        borderRadius: 0.8,
        borderColor: theme.colors.alpha.trueWhite[10],
        color: 'lightgray',
        height: 40,
        padding: '0 18px'
      }}
      onClick={() => window.open(githubRepoUrl, '_blank')}
    >
      <FlexBox alignCenter>
        <StarBorderOutlined fontSize="small" />
        <Line bold marginLeft={1}>
          Star
        </Line>
      </FlexBox>
      <Divider
        orientation="vertical"
        sx={{
          height: '100%',
          marginX: 2
        }}
      />
      <Line bold>{githubRepoStarsCount}</Line>
    </Button>
  );
};
