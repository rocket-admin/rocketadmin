import validator from 'validator';

export const validateUuidByRegex = (uuid: string): boolean => {
  return validator.isUUID(uuid);
};
