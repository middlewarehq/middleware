export const getLineLimit = () => {
  const width = process.stdout.columns;
  const lineLimit = width - 10;

  return lineLimit;
};
