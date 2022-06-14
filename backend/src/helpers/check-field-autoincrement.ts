export function checkFieldAutoincrement(defaultValue: string): boolean {
  let result = false;
  if (
    (defaultValue != null && defaultValue?.toLowerCase().includes('nextval')) ||
    (defaultValue != null && defaultValue?.toLowerCase().includes('generate')) ||
    (defaultValue != null && defaultValue?.toLowerCase().includes('autoincrement')) ||
    (defaultValue != null && defaultValue?.toLowerCase().includes('auto_increment'))
  ) {
    result = true;
  }
  return result;
}
