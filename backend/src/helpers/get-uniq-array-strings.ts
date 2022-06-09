export function getUniqArrayStrings(array: Array<string>): Array<string> {
  return Array.from(new Set(array));
}
