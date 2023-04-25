export function setPropertyValue<TObj, TVal>(obj: TObj, propName: keyof TObj, value: TVal): void {
  if (Object.prototype.hasOwnProperty.call(obj, propName)) {
    (obj as any)[propName] = value;
  }
}
