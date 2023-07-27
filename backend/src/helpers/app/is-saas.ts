import { getProcessVariable } from '../get-process-variable.js';

export function isSaaS(): boolean {
  const isSaaS: unknown = getProcessVariable('IS_SAAS');
  return !!isSaaS;
}
