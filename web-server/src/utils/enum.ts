export const objectEnum = <EnumT>(EnumArg: EnumT) => {
  type EnumKeys = keyof typeof EnumArg;

  return Object.keys(EnumArg).reduce(
    // @ts-ignore
    (obj, key) => ({ ...obj, [key]: key }),
    {} as { [Property in EnumKeys]: Property }
  );
};

export const objectEnumFromFn = <EnumT>(enumFn: () => EnumT) =>
  objectEnum(enumFn());
