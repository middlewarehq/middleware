export const debounce = <T extends (...args: any[]) => any>(
  fn: T,
  duration: number
): any => {
  let timerId: NodeJS.Timeout | null = null;

  return (...args: any[]) => {
    timerId && clearTimeout(timerId);
    timerId = setTimeout(() => fn(...args), duration);
  };
};
