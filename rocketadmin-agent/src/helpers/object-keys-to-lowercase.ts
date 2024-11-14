export function objectKeysToLowercase(obj: any): any {
  const newobj = {};
  for (const [key, value] of Object.entries(obj)) {
    newobj[key.toLowerCase()] = value;
  }
  return newobj;
}