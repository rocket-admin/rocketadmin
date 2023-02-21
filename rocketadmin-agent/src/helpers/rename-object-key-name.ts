export function renameObjectKeyName(
  obj: any,
  oldKey: string,
  newKey: string,
): void {
  if (oldKey !== newKey && obj.hasOwnProperty(oldKey)) {
    Object.defineProperty(
      obj,
      newKey,
      Object.getOwnPropertyDescriptor(obj, oldKey),
    );
    delete obj[oldKey];
  }
}
