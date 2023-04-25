export function comparePrimitiveArrayElements<T>(arr1: T[] | undefined | null, arr2: T[] | undefined | null): boolean {
  if (arr1 == null || arr2 == null) {
    return false;
  }
  return arr1.length === arr2.length && arr1.every(item => arr2.includes(item));
}
