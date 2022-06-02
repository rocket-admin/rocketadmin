export function objectKeysToLowercase(obj: any): any {
  let key;
  const keys = Object.keys(obj);
  let n = keys.length;
  const newobj = {};
  while (n--) {
    key = keys.at(n);
    if (obj.hasOwnProperty(key)) {
      // eslint-disable-next-line security/detect-object-injection
      newobj[key.toLowerCase()] = obj[key];
    }
  }
  return newobj;
}
