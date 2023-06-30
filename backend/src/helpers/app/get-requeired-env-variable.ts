export function getRequiredEnvVariable(variableName: string): string {
  // eslint-disable-next-line security/detect-object-injection
  const variableValue = process.env[variableName];
  if (!variableValue) {
    throw new Error(`Environment variable ${variableName} is not set`);
  }
  return variableValue;
}
