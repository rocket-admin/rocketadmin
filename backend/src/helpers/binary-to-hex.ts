import { Constants } from './constants/constants.js';

export function binaryToHex(
  binaryData: string | Uint8Array | { [key: string]: number } | { type: string; data: number[] },
): string {
  let buffer: Buffer;
  if (binaryData instanceof Uint8Array) {
    buffer = Buffer.from(binaryData);
  } else if (typeof binaryData === 'object') {
    const data =
      binaryData.type === 'Buffer' && Array.isArray(binaryData.data) ? binaryData.data : Object.values(binaryData);
    buffer = Buffer.from(data);
  } else {
    buffer = Buffer.from(binaryData, 'binary');
  }
  return buffer.toString('hex');
}

export function hexToBinary(hexSource: string): Buffer {
  return Buffer.from(hexSource, 'hex');
}

export function isBinary(type: string): boolean {
  return Constants.BINARY_DATATYPES.includes(type.toLowerCase());
}
