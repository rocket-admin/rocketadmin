export function setPropertyValue<TObj, TVal>(obj: TObj, propName: keyof TObj, value: TVal): void {
  if (Object.hasOwn(obj, propName)) {
    // eslint-disable-next-line security/detect-object-injection
    (obj as any)[propName] = value;
  }
}
