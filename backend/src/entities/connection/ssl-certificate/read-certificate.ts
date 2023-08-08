import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function readSslCertificate(): Promise<string> {
  const fileName = 'global-bundle.pem';
  return new Promise((resolve, reject) => {
    fs.readFile(
      join(__dirname, '..', '..', '..', '..', 'files', 'certificates', fileName),
      'utf8',
      function (err, data) {
        if (err) {
          reject(err);
        }
        resolve(data);
      },
    );
  });
}
