export function isTest(): boolean {
  return process.env.NODE_ENV === 'test';
}