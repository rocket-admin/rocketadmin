/* eslint-disable security/detect-object-injection */
interface RenamableObject {
  [key: string]: any;
}

export function renameObjectKeyName(obj: RenamableObject, oldKey: string, newKey: string): void {
  if (oldKey === newKey || !Object.hasOwn(obj, oldKey)) {
    return;
  }
  obj[newKey] = obj[oldKey];
  delete obj[oldKey];
}
