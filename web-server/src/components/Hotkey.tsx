import { darken, useTheme } from '@mui/material';
import { FC, useRef, useEffect, useCallback } from 'react';

import { useBoolState } from '@/hooks/useEasyState';
import { useFeature } from '@/hooks/useFeature';
import { depFn } from '@/utils/fn';

import { FlexBox, FlexBoxProps } from './FlexBox';

const KEY_TEXT_MAP: Record<string, string> = {
  Escape: 'Esc',
  ArrowLeft: '←',
  ArrowRight: '→',
  ArrowUp: '↑',
  ArrowDown: '↓'
};

type Props = {
  hotkey: string | string[];
  detail?: string;
  onHotkey?: (e: KeyboardEvent) => any;
  disabled?: boolean;
  unconditionalTrigger?: boolean;
  modifierKeys?: Partial<Record<'ctrl' | 'shift' | 'alt' | 'meta', true>>;
};

export const Hotkey: FC<FlexBoxProps & Props> = ({
  hotkey,
  detail,
  onHotkey,
  disabled,
  unconditionalTrigger,
  modifierKeys,
  ...props
}) => {
  const theme = useTheme();
  const intervalRef = useRef(-1);
  const enableHotkeys = useFeature('use_hotkeys');
  const pressed = useBoolState();

  const isModifierKeyRequired = Boolean(Object.keys(modifierKeys || {}).length);

  useEffect(() => {
    if (!enableHotkeys) return;

    let keys: string[];
    if (!Array.isArray(hotkey)) {
      keys = [hotkey];
    } else {
      keys = hotkey;
    }

    const bindKey = (key: string) => {
      const onKeyDown = (e: KeyboardEvent) => {
        if (disabled || !e?.key) return;

        const isSameKey = e.key.toLowerCase() === key.toLowerCase();
        if (!isSameKey) return;

        const isModifierKeyPressed =
          e.altKey || e.ctrlKey || e.shiftKey || e.metaKey;

        if (!isModifierKeyRequired && isModifierKeyPressed) return;

        const isModifierKeyRequiredAndPressed =
          isModifierKeyRequired &&
          ((modifierKeys?.alt && e.altKey) ||
            (modifierKeys?.ctrl && e.ctrlKey) ||
            (modifierKeys?.shift && e.shiftKey) ||
            (modifierKeys?.meta && e.metaKey));

        const isValidKeypress = isModifierKeyRequired
          ? isModifierKeyRequiredAndPressed
          : true;

        if (!isValidKeypress) return;

        e.stopImmediatePropagation();

        cancelAnimationFrame(intervalRef.current);
        intervalRef.current = requestAnimationFrame(() => {
          const el = document.activeElement;
          const tagName = el.tagName.toLowerCase();
          //@ts-ignore
          const isContentEditable = el.isContentEditable;
          const isEditable =
            isContentEditable || tagName === 'input' || tagName === 'textarea';

          if (!unconditionalTrigger && isEditable) return;
          onHotkey?.(e);
          depFn(pressed.true);
        });
      };

      const onKeyUp = () => {
        depFn(pressed.false);
      };

      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);

      const unbindKey = () => {
        window.removeEventListener('keydown', onKeyDown);
        window.removeEventListener('keyup', onKeyUp);
      };

      return unbindKey;
    };

    const unbindFns = keys.map(bindKey);

    return () => {
      unbindFns.forEach((fn) => fn());
    };
  }, [
    hotkey,
    onHotkey,
    disabled,
    unconditionalTrigger,
    enableHotkeys,
    pressed.true,
    pressed.false,
    modifierKeys?.meta,
    modifierKeys?.alt,
    modifierKeys?.ctrl,
    modifierKeys?.shift,
    isModifierKeyRequired
  ]);

  const getModifierKeyLabel = useCallback(() => {
    if (modifierKeys?.meta) return `⌘`;
    if (modifierKeys?.shift) return `Shf`;
    if (modifierKeys?.alt) return `Alt`;
    if (modifierKeys?.ctrl) return `Ctrl`;
  }, [
    modifierKeys?.alt,
    modifierKeys?.ctrl,
    modifierKeys?.meta,
    modifierKeys?.shift
  ]);

  const getLabel = useCallback(() => {
    if (Array.isArray(hotkey)) {
      return hotkey
        .map((key) =>
          !isModifierKeyRequired ? null : (
            <>
              <span style={{ fontSize: '1.2em' }}>{getModifierKeyLabel()}</span>
              +{KEY_TEXT_MAP[key] || key}
            </>
          )
        )
        .join(', ');
    }

    return !isModifierKeyRequired ? (
      KEY_TEXT_MAP[hotkey] || hotkey
    ) : (
      <>
        <span style={{ fontSize: '1.2em' }}>{getModifierKeyLabel()}</span>+
        {KEY_TEXT_MAP[hotkey] || hotkey}
      </>
    );
  }, [getModifierKeyLabel, hotkey, isModifierKeyRequired]);

  if (
    (typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0) ||
    !enableHotkeys
  )
    return null;

  return (
    <FlexBox
      {...props}
      title={detail || <>Press {getLabel()}</>}
      darkTip
      tooltipPlacement="top"
      centered
      sx={{
        bgcolor: darken(theme.colors.primary.main, 0.5),
        height: '1.2em',
        width: isModifierKeyRequired ? undefined : '1.2em',
        px: isModifierKeyRequired ? 1 / 4 : undefined,
        borderRadius: 1 / 2,
        boxShadow: pressed.value
          ? undefined
          : `0 0 0 1px ${theme.colors.primary.dark}`,
        position: 'absolute',
        left: `calc(100% - ${theme.spacing(isModifierKeyRequired ? 2.5 : 1)})`,
        bottom: `calc(100% - ${theme.spacing(1.5)})`,
        color: '#FFFD',
        fontWeight: 'medium',
        fontFamily: 'monospace',
        ...props.sx
      }}
    >
      {getLabel()}
      {props.children}
    </FlexBox>
  );
};
