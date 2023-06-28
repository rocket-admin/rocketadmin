import { getProcessVariable } from '../get-process-variable.js';

export function isSaaS(): boolean {
  const isSaaS: unknown = getProcessVariable('IS_SAAS');
  if (typeof isSaaS === 'string') {
    return isSaaS.toLowerCase() === 'true';
  }
  if (typeof isSaaS === 'boolean') {
    return isSaaS;
  }
  if (typeof isSaaS === 'number') {
    return isSaaS === 1;
  }
  return false;
}
