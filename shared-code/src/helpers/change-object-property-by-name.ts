export function changeObjPropValByName<TObj extends Record<string, any>, TVal>(
  obj: TObj,
  propName: keyof TObj,
  value: TVal,
): TObj {
  if (propName in obj) {
    return {
      ...obj,
      [propName]: value,
    };
  }
  return obj;
}
