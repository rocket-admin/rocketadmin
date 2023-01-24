import { getProcessVariable } from '../get-process-variable.js';

export function isSaaS(): boolean {
  const isSaaS = getProcessVariable('IS_SAAS');
  return isSaaS?.toLowerCase() === 'true';
}
