export function setPropertyValue<TObj, TVal>(obj: TObj, propName: keyof TObj, value: TVal): void {
  if (Object.prototype.hasOwnProperty.call(obj, propName)) {
    // eslint-disable-next-line security/detect-object-injection
    (obj as any)[propName] = value;
  }
}
