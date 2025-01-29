import { isObjectPropertyExists } from './validators/is-object-property-exists-validator.js';

export function renameObjectKeyName(obj: any, oldKey: string, newKey: string): void {
  if (oldKey !== newKey && isObjectPropertyExists(obj, oldKey)) {
    Object.defineProperty(obj, newKey, Object.getOwnPropertyDescriptor(obj, oldKey));
    // eslint-disable-next-line security/detect-object-injection
    delete obj[oldKey];
  }
}
