/* eslint-disable security/detect-non-literal-fs-filename */
import fs from 'fs';
import path from 'path';
import { access, mkdir } from 'fs/promises';

export function writeFileUtil(fileName: string, data: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    fs.writeFile(path.join(process.cwd(), fileName), data, 'utf8', (err) => {
      if (err) {
        reject(err);
      }
      resolve();
    });
  });
}

export function writeFileIfNotExistsUtil(fileName: string, data: string): Promise<void> {
  return new Promise<void>(async (resolve, reject) => {
    try {
      await access(path.join(process.cwd(), fileName));
      console.log(
        '-> Configuration file already exists. If you want ro renew configuration, please delete current file',
      );
      resolve();
    } catch (_e) {
      fs.writeFile(path.join(process.cwd(), fileName), data, 'utf8', (err) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    }
  });
}

export async function mkDirIfNotExistsUtil(dirname: string): Promise<void> {
  try {
    await access(path.join(process.cwd(), dirname));
  } catch (_e) {
    await mkdir(path.join(process.cwd(), dirname));
  }
}
