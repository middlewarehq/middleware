import { Button, Card, Box, styled, Container } from '@mui/material';
import Head from 'next/head';
import { ReactNode } from 'react';

import background from '@/assets/background.png';
import LoginDash from '@/assets/login-dashboard.svg';
import LoginTeam from '@/assets/login-eng-team.svg';
import LoginPoints from '@/assets/login-key-points.svg';
import LoginGoals from '@/assets/login-personal-goals.svg';
import LoginCenter from '@/assets/login-presentation.svg';
import { FlexBox } from '@/components/FlexBox';
import { Logo } from '@/components/Logo/Logo';
import { Line } from '@/components/Text';

function Page() {
  return (
    <>
      <Head>
        <title>Onboarding | MiddlewareHQ</title>
      </Head>
      <OnboardingContent />
    </>
  );
}

Page.getLayout = (page: ReactNode) => <>{page}</>;

export default Page;

const Content = styled(Box)(
  () => `
      display: flex;
      flex: 1;
      width: 100%;
  `
);

const MainContent = styled(Box)(
  () => `
    width: 100%;
    display: flex;
    align-items: center;
  `
);

const containerStyles = {
  height: '100%',
  width: '100%',
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  margin: 'auto',
  display: 'flex',
  alignItems: 'flex-end',
  justifyContent: 'center',
  backgroundImage: `url(${background})`
};

const OnboardingContent = () => {
  return (
    <Content>
      <MainContent>
        <Box sx={containerStyles}>
          <FlexBox alignEnd sx={{ opacity: 0.5 }}>
            <LoginTeam height="90px" />
            <LoginPoints height="130px" />
            <LoginCenter height="200px" />
            <LoginGoals height="130px" />
            <LoginDash height="90px" />
          </FlexBox>
        </Box>

        <Container
          sx={{
            position: 'relative',
            display: 'flex',
            alignItems: 'center',
            flexDirection: 'column'
          }}
          maxWidth="sm"
        >
          <FlexBox>
            <FlexBox
              component={Card}
              p={'40px'}
              col
              gap={'20px'}
              width={'432px'}
            >
              <FlexBox width={'152px'} borderRadius={'4px'} bgcolor={'#1D223D'}>
                <Logo mode="long" />
              </FlexBox>
              <FlexBox col>
                <Line sx={{ fontSize: '22px' }} semibold white>
                  Welcome
                </Line>
                <Line sx={{ fontSize: '14px', opacity: '60%' }} white>
                  We’re your partner in productivity
                </Line>
              </FlexBox>
              <FlexBox col gap={'16px'}>
                {featureList.map((feature) => (
                  <FlexBox key={feature} alignCenter gap={'12px'}>
                    <Bullet />
                    <Line sx={{ fontSize: '14px', opacity: '80%' }} white>
                      {feature}
                    </Line>
                  </FlexBox>
                ))}
              </FlexBox>
              <Button variant="contained">Continue</Button>
            </FlexBox>
          </FlexBox>
        </Container>
      </MainContent>
    </Content>
  );
};

const featureList = [
  'Get your DORA metrics',
  'Most detailed open source DORA app',
  'Create teams and get team-wise insights'
];

const Bullet = () => {
  return (
    <svg
      width="16"
      height="17"
      viewBox="0 0 16 17"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M14.25 9.48344C13.75 11.9834 11.865 14.3374 9.21998 14.8634C7.92997 15.1203 6.59179 14.9637 5.39598 14.4158C4.20018 13.868 3.2077 12.9568 2.55988 11.812C1.91205 10.6673 1.6419 9.34733 1.78789 8.04012C1.93388 6.7329 2.48857 5.50507 3.37298 4.53144C5.18698 2.53344 8.24998 1.98344 10.75 2.98344"
        stroke="#14AE5C"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5.75 8.4834L8.25 10.9834L14.25 4.4834"
        stroke="#14AE5C"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};
