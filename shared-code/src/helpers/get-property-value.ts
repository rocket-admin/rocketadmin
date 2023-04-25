export function getPropertyValue<T extends object, K extends keyof T>(obj: T, propName: K): T[K] | undefined {
  const descriptor = Object.getOwnPropertyDescriptor(obj, propName);
  if (descriptor) {
    return descriptor.value;
  }
  return undefined;
}
