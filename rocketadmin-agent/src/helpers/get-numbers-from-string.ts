export function getNumbersFromString(str: string): number {
  return parseInt(str.match(/\d/g)?.join(''), 10);
}
