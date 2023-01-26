import { Constants } from './constants/constants.js';

export function binaryToHex(binaryData: string): string {
  return Buffer.from(binaryData, 'binary').toString('hex');
}

export function hexToBinary(hexSource: string): Buffer {
  return Buffer.from(hexSource, 'hex');
}

export function isBinary(type: string): boolean {
  return Constants.BINARY_DATATYPES.includes(type.toLowerCase());
}
