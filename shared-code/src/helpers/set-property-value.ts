export function setPropertyValue<TObj extends {}>(obj: TObj, propName: keyof TObj, value: TObj[keyof TObj]): void {
  if (Object.hasOwn(obj, propName)) {
    obj[propName] = value;
  }
}
