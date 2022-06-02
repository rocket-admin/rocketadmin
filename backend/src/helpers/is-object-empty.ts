export function isObjectEmpty(obj: any): boolean {
  for (const key in obj) {
    return false;
  }
  return true;
}
