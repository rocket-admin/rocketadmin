export function changeObjPropValByPropName<TObj, TVal>(obj: TObj, propName: string, value: TVal): TObj {
  // check property existence before setting
  if (obj !== undefined && obj.hasOwnProperty(propName)) {
    // eslint-disable-next-line security/detect-object-injection
    obj[propName] = value;
    return obj;
  }
  return obj;
}
