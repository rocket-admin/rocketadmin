export function isObjectEmpty(obj: any): boolean {
  for (const _key in obj) {
    return false;
  }
  return true;
}
