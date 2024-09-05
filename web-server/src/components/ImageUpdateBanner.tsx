import CloseIcon from '@mui/icons-material/Close';
import ContentCopyRoundedIcon from '@mui/icons-material/ContentCopyRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import {
  Divider,
  Button,
  useTheme,
  Dialog,
  Slide,
  DialogContent,
  darken
} from '@mui/material';
import { TransitionProps } from '@mui/material/transitions';
import { isToday } from 'date-fns';
import { useSnackbar } from 'notistack';
import { FC, ReactElement, Ref, forwardRef, useCallback, useMemo } from 'react';
import CopyToClipboard from 'react-copy-to-clipboard';

import { FlexBox } from '@/components/FlexBox';
import { Line } from '@/components/Text';
import { useModal } from '@/contexts/ModalContext';
import { useEasyState } from '@/hooks/useEasyState';
import { appSlice } from '@/slices/app';
import { useDispatch, useSelector } from '@/store';

const FETCH_LATEST_IMAGE_INSTRUCTIONS = [
  `docker stop middleware  `,
  `docker pull middlewareeng/middleware:latest
docker rm -f middleware || true
docker run --name middleware
           -p 3333:3333
           -v middleware_postgres_data:/var/lib/postgresql/data
           -v middleware_keys:/app/keys
           -d middlewareeng/middleware:latest
docker logs -f middleware  `,
  `docker rm -f middleware  `
];

export const Transition = forwardRef(function Transition(
  props: TransitionProps & { children: ReactElement<any, any> },
  ref: Ref<unknown>
) {
  return <Slide direction="up" ref={ref} timeout={250} {...props} />;
});

export const ImageUpdateBanner = () => {
  const theme = useTheme();
  const { addModal } = useModal();
  const dispatch = useDispatch();

  const latestImageStatus = useSelector((s) => s.app.latestImageStatus);
  const imageUpdateBannerLastDisabledAt = useSelector(
    (s) => s.app.lastDisabledImageUpdateBannerAt
  );
  const isImageUpdateBannerDisabledToday = useMemo(
    () =>
      imageUpdateBannerLastDisabledAt
        ? isToday(new Date(imageUpdateBannerLastDisabledAt))
        : false,
    [imageUpdateBannerLastDisabledAt]
  );

  const showImageUpdateBanner = useEasyState<boolean>(
    !isImageUpdateBannerDisabledToday
  );

  const disableImageUpdateBanner = useCallback(() => {
    showImageUpdateBanner.set(false);
    dispatch(appSlice.actions.setImageUpdateBannerAsDisabled(new Date()));
  }, [dispatch, showImageUpdateBanner]);

  const openImageUpdateInstructionsModal = useCallback(async () => {
    addModal({
      title: `Update Image Instructions`,
      body: (
        <FlexBox col maxWidth="900px">
          <Line>
            We've just released a new image release for your self-hosted Dora.
            Update your image now to get the latest features and improvements.
          </Line>
          <FlexBox col mt={2} gap2>
            <Line bold big>
              Instructions:
            </Line>
            <Line>
              1. In case you want to stop the container, run the following
              command:
              <CopyDockerCommandComponent
                text={FETCH_LATEST_IMAGE_INSTRUCTIONS[0]}
              />
            </Line>
            <Line>
              2. In order to fetch latest version from remote and then starting
              the system, use following command:
              <CopyDockerCommandComponent
                text={FETCH_LATEST_IMAGE_INSTRUCTIONS[1]}
              />
            </Line>
            <Line>
              3. If you see an error like:{' '}
              <Line warning mono small>
                Conflict. The container name "/middleware" is already in use by
                container.
              </Line>{' '}
              <br />
              Then run following command before running the container again:
              <CopyDockerCommandComponent
                text={FETCH_LATEST_IMAGE_INSTRUCTIONS[2]}
              />
            </Line>
          </FlexBox>
        </FlexBox>
      ),
      showCloseIcon: true
    });
  }, [addModal]);

  return (
    <Dialog
      open={
        showImageUpdateBanner.value && latestImageStatus?.is_update_available
      }
      TransitionComponent={Transition}
      maxWidth={false}
      fullWidth
      scroll="paper"
      onClose={disableImageUpdateBanner}
      sx={{
        '& .MuiDialog-container': {
          alignItems: 'flex-end',
          pointerEvents: 'none'
        },
        '&.MuiDialog-root': {
          pointerEvents: 'none'
        },
        '.MuiPaper-root': {
          pointerEvents: 'initial',
          boxShadow: '0 9px 13.5px 4.5px #0003',
          width: 'fit-content',
          maxWidth: '80vw'
        }
      }}
      hideBackdrop
      disableEnforceFocus
    >
      <DialogContent>
        <FlexBox fullWidth justifyBetween gap={2} alignCenter>
          <FlexBox gap={2} alignCenter>
            <FlexBox gap1 alignCenter>
              <InfoRoundedIcon />
              <Line bigish white>
                New Release Available
              </Line>
            </FlexBox>
            <Divider orientation="vertical" flexItem />
            <Line>
              We've just released a new image release for your self-hosted Dora.
              Update your image now to get the latest features and improvements.
            </Line>
            <Button
              variant="contained"
              size="small"
              onClick={openImageUpdateInstructionsModal}
            >
              Read Instructions
            </Button>
          </FlexBox>
          <CloseIcon
            onClick={disableImageUpdateBanner}
            sx={{ cursor: 'pointer' }}
          />
        </FlexBox>
      </DialogContent>
    </Dialog>
  );
};

const CopyDockerCommandComponent: FC<{ text: string }> = ({ text }) => {
  const theme = useTheme();
  const { enqueueSnackbar } = useSnackbar();
  return (
    <FlexBox
      fullWidth
      alignCenter
      gap={2}
      p={2}
      sx={{
        backgroundColor: darken(theme.palette.background.paper, 0.2),
        borderRadius: theme.spacing(1)
      }}
      alignStart
      mt={theme.spacing(2 / 3)}
    >
      <pre
        style={{
          width: '100%',
          margin: '0px'
        }}
      >
        {text}
      </pre>
      <CopyToClipboard
        text={text}
        onCopy={() => {
          enqueueSnackbar('Command copied successfully', {
            variant: 'success',
            autoHideDuration: 2000
          });
        }}
      >
        <ContentCopyRoundedIcon
          fontSize="small"
          sx={{
            cursor: 'pointer'
          }}
        />
      </CopyToClipboard>
    </FlexBox>
  );
};
