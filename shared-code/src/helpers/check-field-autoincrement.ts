export function checkFieldAutoincrement(defaultValue: string, extra: string = ''): boolean {
  let result = false;
  if (
    (defaultValue !== null && defaultValue?.toLowerCase().includes('nextval')) ||
    (defaultValue !== null && defaultValue?.toLowerCase().includes('generate')) ||
    (defaultValue !== null && defaultValue?.toLowerCase().includes('autoincrement')) ||
    (defaultValue !== null && defaultValue?.toLowerCase().includes('auto_increment')) ||
    (extra !== null && extra.toLowerCase().includes('auto_increment')) ||
    (extra !== null && extra.toLowerCase().includes('autoincrement'))
  ) {
    result = true;
  }
  return result;
}
