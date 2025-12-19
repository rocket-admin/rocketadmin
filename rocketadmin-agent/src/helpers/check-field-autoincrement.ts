export function checkFieldAutoincrement(defaultValue: string): boolean {
  let result = false;
  if (
    (defaultValue?.toLowerCase().includes('nextval')) ||
    (defaultValue?.toLowerCase().includes('generate')) ||
    (defaultValue?.toLowerCase().includes('autoincrement')) ||
    (defaultValue?.toLowerCase().includes('auto_increment'))
  ) {
    result = true;
  }
  return result;
}
