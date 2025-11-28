export function validateStringWithEnum(str: string, en: any): boolean {
  return !!Object.values(en).find((value) => value === str);
}
