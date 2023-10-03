export function setSaasEnvVariable(value = false): void {
  if(value) {
    process.env.IS_SAAS = 'true';
    return;
  }
  delete process.env.IS_SAAS;
}
