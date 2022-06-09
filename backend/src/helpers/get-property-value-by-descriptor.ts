export function getPropertyValueByDescriptor<T>(obj: T, propName: string): any {
  return Object.getOwnPropertyDescriptor(obj, propName).value;
}
