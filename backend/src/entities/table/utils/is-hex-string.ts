export function isHexString(hStr: string): boolean {
  const re = /[0-9A-Fa-f]{6}/g;
  return re.test(hStr);
}
