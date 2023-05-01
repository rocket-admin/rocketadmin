import { Messages } from '../../exceptions/text/messages.js';

export function requiredEnvironmentVariablesValidator(): void {
  const requiredParameterNames: Array<string> = [
    'TYPEORM_URL',
    'PRIVATE_KEY',
    'JWT_SECRET',
  ];
  const requiredParameters: Array<{ [k: string]: string | null }> = requiredParameterNames.map((paramName) => {
    const paramValue = getEnvironmentVariable(paramName);
    return {
      [paramName]: paramValue,
    };
  });
  const emptyRequiredParameterNames: Array<string> = requiredParameters
    .filter((param) => {
      return !param[Object.keys(param)[0]];
    })
    .map((param) => Object.keys(param)[0]);
  if (emptyRequiredParameterNames.length > 0) {
    throw new Error(Messages.REQUIRED_PARAMETERS_MISSING(emptyRequiredParameterNames));
  }
}

function getEnvironmentVariable(key: string): string | null {
  // eslint-disable-next-line security/detect-object-injection
  return process.env[key] || null;
}
