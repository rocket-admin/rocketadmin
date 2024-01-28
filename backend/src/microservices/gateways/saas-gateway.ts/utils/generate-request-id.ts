import { nanoid } from 'nanoid';
export function generateRequestId(): string {
  return nanoid(10);
}
