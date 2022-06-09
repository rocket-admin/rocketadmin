export function getProcessVariable(variableName: string): string {
  // eslint-disable-next-line security/detect-object-injection
  return process.env[variableName];
}
