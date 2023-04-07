export function enumToString(en: any): string {
  const values = Object.values(en).filter((v) => typeof v === 'string' || typeof v === 'number');

  return values.map((v) => (typeof v === 'string' ? `'${v}'` : v)).join(', ');
}
