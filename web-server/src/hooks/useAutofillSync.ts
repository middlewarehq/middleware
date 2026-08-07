import { useEffect, useRef } from 'react';

/**
 * Browser autofill can finish filling a field before React has finished
 * hydrating and attached its event listeners, so the very first
 * `input`/`change` event it fires is silently missed. The field then sits
 * fully rendered with the browser's autofilled text, but React's
 * controlled state -- and therefore MUI's label-shrink/border-notch, which
 * key off that state -- still think it's empty. That's what makes the
 * label render on top of the value until some *unrelated* interaction
 * (any click, any keypress) finally gives React an event to catch up on.
 *
 * Polls the real input value directly for a brief window right after
 * mount and, the moment it finds a value React doesn't know about yet,
 * feeds it back through the normal onChange path -- so the state catches
 * up before the user ever has to interact with the page.
 */
export const useAutofillSync = (
  currentValue: string,
  onDetected: (value: string) => void
) => {
  const ref = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (currentValue) return; // already has a value via the normal path

    let attempts = 0;
    const id = setInterval(() => {
      attempts += 1;
      const domValue = ref.current?.value;
      if (domValue) {
        onDetected(domValue);
        clearInterval(id);
      } else if (attempts > 20) {
        // ~1s: autofill either isn't happening or has already been caught
        // by a real event by now.
        clearInterval(id);
      }
    }, 50);

    return () => clearInterval(id);
    // Intentionally mount-only: this is racing hydration, not `value`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return ref;
};
