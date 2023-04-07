export function isObjectEmpty(obj: any): boolean {
  if (typeof obj !== 'object' || Array.isArray(obj)) {
    throw new Error('Input is not an object');
  }
  return Object.keys(obj).length === 0;
}
