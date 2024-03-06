export function isObjectEmpty(obj: any): boolean {
  if (!obj) {
    return true;
  }
  for (const _ in obj) {
    return false;
  }
  return true;
}
