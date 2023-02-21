export function objectKeysToLowercase(obj: any): any {
  // eslint-disable-next-line prefer-const
  let key,
    // eslint-disable-next-line prefer-const
    keys = Object.keys(obj);
  let n = keys.length;
  const newobj = {};
  while (n--) {
    key = keys[n];
    newobj[key.toLowerCase()] = obj[key];
  }
  return newobj;
}
