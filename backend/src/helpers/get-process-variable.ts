export function getProcessVariable(variableName: string): string | null {
  // eslint-disable-next-line security/detect-object-injection
  return process.env[variableName] ? process.env[variableName] : null;
}
