export function validateStringWithEnum(str: string, en: any): boolean {
  return !!Object.keys(en).find((key) => key === str);
}
