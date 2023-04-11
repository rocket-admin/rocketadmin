export function objectKeysToLowercase(obj: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === 'object' && value !== null) {
      result[key.toLowerCase()] = objectKeysToLowercase(value);
    } else {
      result[key.toLowerCase()] = value;
    }
  }

  return result;
}
