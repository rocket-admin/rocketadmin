export function isObjectPropertyExists(obj: unknown, property: string): boolean {
  if (!obj) {
    return false;
  }
  return Object.prototype.hasOwnProperty.call(obj, property);
}
