export const depFn = <T extends AnyFunction>(fn: T, ...args: Parameters<T>) =>
  fn?.(...args);
