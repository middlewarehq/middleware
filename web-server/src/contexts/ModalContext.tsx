import { ClearRounded, RestartAltRounded } from '@mui/icons-material';
import {
  LoadingButton,
  DatePicker,
  DatePickerProps,
  StaticDatePicker
} from '@mui/lab';
import {
  Box,
  Button,
  ButtonProps,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  useTheme,
  alpha,
  lighten,
  DialogContentProps
} from '@mui/material';
import {
  endOfDay,
  format,
  intlFormatDistance,
  differenceInHours,
  isToday
} from 'date-fns';
import Router from 'next/router';
import { last } from 'ramda';
import {
  createContext,
  FC,
  ReactNode,
  useCallback,
  useContext,
  useState,
  useEffect,
  useMemo
} from 'react';

import { Transition } from '@/components/FeatureFlagOverrides';
import { FlexBox } from '@/components/FlexBox';
import { LightTooltip } from '@/components/Shared';
import { Line } from '@/components/Text';
import { useEasyState } from '@/hooks/useEasyState';
import { randomId } from '@/utils/randomId';
import { wait } from '@/utils/wait';

export type ModalT = {
  key: string;
  title?: ReactNode;
  body?: ReactNode;
  actions?: {
    confirm?: (modal: ModalT) => any;
    confirmBody?: ReactNode;
    confirmType?: ButtonProps['color'];
    loading?: boolean;
    closeOnConfirm?: boolean;
    cancel?: (modal: ModalT) => any;
    cancelBody?: ReactNode;
    cancelType?: ButtonProps['color'];
  };
  /** @readonly do not supply this valye manually */
  isOpen?: boolean;
  /**
   * Called to close the modal.
   * @returns {any | boolean} `cancelClosure` - Should it actually close the modal? If `true`, modal won't be closed. Use for pre-close confirmations.
   */
  close?: () => any;
  showCloseIcon?: boolean;
  sx?: DialogContentProps['sx'];
};

type NewModal = Omit<ModalT, 'key'>;

type ModalContextT = {
  modals: ModalT[];
  addModal: (modal: NewModal) => ModalT;
  updateModal: (modal: ModalT) => void;
  setModalLoading: (key: string, loading?: boolean) => void;
  closeModal: (key: string) => void;
  closeAllModals: () => void;
};

export const ModalContext = createContext<ModalContextT>({
  modals: [],
  addModal: (_modal) => ({ key: '', ..._modal }),
  updateModal: (_modal) => _modal,
  closeModal: (_key) => {},
  setModalLoading: (_key) => {},
  closeAllModals: () => {}
});

export const useModal = () => {
  const { addModal, closeModal, updateModal, setModalLoading, closeAllModals } =
    useContext(ModalContext);
  return { addModal, closeModal, updateModal, setModalLoading, closeAllModals };
};

export const ModalCtxProvider: FC = ({ children }) => {
  const theme = useTheme();
  const [modals, setModals] = useState<ModalT[]>([]);

  const updateModal = useCallback((modal: ModalT) => {
    setModals((modals) =>
      modals.map((m) => {
        if (m.key !== modal.key) return m;

        return modal;
      })
    );
  }, []);

  const closeModal = useCallback(
    async (key: string) => {
      updateModal({ key, isOpen: false });
      await wait(250);
      setModals((modals) => modals.filter((modal) => modal.key !== key));
    },
    [updateModal]
  );

  const closeAllModals = useCallback(() => {
    setModals([]);
  }, []);

  const addModal = useCallback(
    (modal: NewModal) => {
      const id = randomId();
      const newModal: ModalT = {
        isOpen: true,
        key: id,
        ...modal,
        close: () => {
          const cancelClosure = Boolean(modal?.close?.());
          !cancelClosure && closeModal(id);
        },
        actions: {
          ...modal.actions,
          closeOnConfirm: modal.actions?.closeOnConfirm ?? true
        }
      };

      setModals((modals) => modals.concat(newModal));

      return newModal;
    },
    [closeModal]
  );

  const setModalLoading = useCallback(
    (key: string, loading: boolean = true) => {
      setModals((modals) =>
        modals.map((m) => {
          if (m.key !== key) return m;

          return {
            ...m,
            actions: {
              ...m.actions,
              loading
            }
          };
        })
      );
    },
    []
  );

  const handleSubmit = useCallback(
    async (modal: ModalT) => {
      await modal.actions?.confirm?.(modal);
      modal.actions?.closeOnConfirm && closeModal(modal.key);
    },
    [closeModal]
  );

  const handleClose = useCallback(
    async (modal) => {
      await modal?.actions?.cancel?.(modal);
      closeModal(modal?.key);
    },
    [closeModal]
  );

  useEffect(() => {
    Router.events.on('routeChangeComplete', () => setModals([]));
  }, []);

  return (
    <ModalContext.Provider
      value={{
        modals,
        addModal,
        closeModal,
        updateModal,
        setModalLoading,
        closeAllModals
      }}
    >
      {children}
      {modals.map((modal) => (
        <Dialog
          key={modal.key}
          open={modal.isOpen}
          onClose={() => {
            // Only handle external-close for the last modal
            if (modal !== last(modals)) return;

            modal.close ? modal.close() : handleClose(modal.key);
          }}
          TransitionComponent={Transition}
          PaperProps={{
            sx: {
              bgcolor: alpha(
                lighten(theme.palette.background.default, 0.1),
                0.92
              ),
              maxWidth: 'unset'
            }
          }}
        >
          {Boolean(modal.title) && (
            <DialogTitle sx={{ px: 3, py: 2, pb: 1, fontSize: '1.2em' }}>
              <FlexBox alignCenter justifyBetween fullWidth>
                {modal.title}
                {modal?.showCloseIcon && (
                  <FlexBox alignCenter gap1>
                    <Line
                      tiny
                      sx={{ cursor: 'pointer' }}
                      onClick={() =>
                        modal.close ? modal.close() : handleClose(modal.key)
                      }
                    >
                      esc
                    </Line>
                    <IconButton
                      sx={{
                        border: `1px solid ${theme.colors.secondary.light}`
                      }}
                      onClick={() =>
                        modal.close ? modal.close() : handleClose(modal.key)
                      }
                    >
                      <ClearRounded />
                    </IconButton>
                  </FlexBox>
                )}
              </FlexBox>
            </DialogTitle>
          )}
          {Boolean(modal.body) && (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (modal.actions?.loading) return;
                handleSubmit(modal);
              }}
            >
              <DialogContent
                sx={{
                  px: 3,
                  pb: Boolean(modal.actions?.confirm) ? 1 : 2,
                  pt: Boolean(modal.title) ? 1 : 2,
                  ...modal.sx
                }}
              >
                {modal.body}
              </DialogContent>
            </form>
          )}
          {Boolean(modal.actions?.confirm) && (
            <DialogActions sx={{ px: 3, py: 2, pt: 1 }}>
              <Button
                onClick={async () => {
                  await modal.actions.cancel?.(modal);
                  closeModal(modal.key);
                }}
                size="small"
                variant="outlined"
                color={modal.actions.cancelType || 'secondary'}
                sx={{
                  ':focus': {
                    outline: `2px ${theme.colors.primary.main} solid`
                  }
                }}
              >
                {modal.actions.cancelBody || 'Cancel'}
              </Button>
              <LoadingButton
                onClick={() => handleSubmit(modal)}
                size="small"
                variant="contained"
                color={modal.actions.confirmType}
                loading={modal.actions.loading}
                autoFocus
                sx={{
                  ':focus': {
                    outline: `2px ${theme.colors.primary.main} solid`
                  }
                }}
              >
                {modal.actions.confirmBody || 'Confirm'}
              </LoadingButton>
            </DialogActions>
          )}
        </Dialog>
      ))}
    </ModalContext.Provider>
  );
};

export const ModalDatePicker: FC<
  Omit<DatePickerProps<any>, 'renderInput' | 'value'> & { defaultValue?: Date }
> = ({ defaultValue, onChange, ...props }) => {
  const today = useMemo(() => new Date(), []);
  const date = useEasyState(defaultValue);

  useEffect(() => {
    onChange(date.value);
  }, [date.value, onChange]);

  return (
    <DatePicker
      {...props}
      label="Due date"
      inputFormat="dd/MM/yyyy"
      value={date.value}
      onChange={(newDate: Date) => date.set(endOfDay(newDate))}
      renderInput={(p: any) => (
        <TextField
          {...p}
          helperText={
            !date.value
              ? 'Not set'
              : differenceInHours(today, date.value) < 1
                ? `${intlFormatDistance(date.value, today)} on a ${format(
                    date.value,
                    'eeee'
                  )}`
                : 'Today'
          }
          FormHelperTextProps={{
            sx: { m: 0, textAlign: 'right' }
          }}
        />
      )}
    />
  );
};

export const StaticModalDatePicker: FC<
  Omit<DatePickerProps<any>, 'renderInput' | 'value'> & {
    defaultValue?: Date;
    title?: ReactNode;
    onClose?: AnyFunction;
  }
> = ({ defaultValue, onChange, title, onClose, ...props }) => {
  const today = useMemo(() => new Date(), []);
  const date = useEasyState(defaultValue || null);
  const theme = useTheme();

  useEffect(() => {
    onChange(date.value);
  }, [date.value, onChange]);

  return (
    <FlexBox col gap={1}>
      <FlexBox fontSize="small" justifyBetween alignCenter gap={1}>
        <Box>
          <Box>{title || 'Due Date'}</Box>
          <Box fontSize="smaller" color="secondary.dark">
            {!date.value
              ? 'Not set'
              : !isToday(date.value)
                ? `${intlFormatDistance(date.value, today)} on a ${format(
                    date.value,
                    'eeee'
                  )}`
                : 'Today'}
          </Box>
        </Box>
        <FlexBox flex1 />
        <LightTooltip arrow title="Clear">
          <IconButton onClick={date.clear} size="small">
            <RestartAltRounded fontSize="small" />
          </IconButton>
        </LightTooltip>
        {Boolean(onClose) && (
          <LightTooltip arrow title="Close Modal">
            <IconButton onClick={onClose} size="small">
              <ClearRounded fontSize="small" />
            </IconButton>
          </LightTooltip>
        )}
      </FlexBox>
      <Box
        border={`1px solid ${theme.colors.secondary.light}`}
        borderRadius={1}
        overflow="hidden"
      >
        <StaticDatePicker
          {...props}
          showToolbar={false}
          value={date.value}
          onChange={(newDate: Date) => date.set(endOfDay(newDate))}
          renderInput={(p: any) => <TextField {...p} />}
        />
      </Box>
    </FlexBox>
  );
};
