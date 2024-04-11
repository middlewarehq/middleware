export const wait = (milliseconds: number): Promise<void> =>
  new Promise((res) => setTimeout(res, milliseconds));
