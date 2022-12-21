import { getProcessVariable } from '../get-process-variable';

export function isSaaS(): boolean {
  const isSaaS = getProcessVariable('IS_SAAS');
  return isSaaS?.toLowerCase() === 'true';
}
