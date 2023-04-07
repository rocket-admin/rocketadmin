export function getPropertyValueByDescriptor<T extends Record<string, any>, K extends keyof T>(
  obj: T,
  propName: K,
): T[K] | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(obj, propName);
  return descriptor?.value;
}
