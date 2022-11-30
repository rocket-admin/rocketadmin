export function isObjectEmpty(obj: any): boolean {
  for (const _ in obj) {
    return false;
  }
  return true;
}
