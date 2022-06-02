export function compareArrayElements(arr1: Array<any>, arr2: Array<any>): boolean {
  if (arr1.length != arr2.length) {
    return false;
  }
  for (let i = 0; i < arr1.length; i++) {
    const include = arr2.includes(arr1.at(i));
    if (!include) {
      return false;
    }
  }
  return true;
}
