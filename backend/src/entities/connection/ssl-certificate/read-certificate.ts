import fs from 'fs';
import path from 'path';

export async function readSslCertificate(): Promise<string> {
  const fileName = 'global-bundle.pem';
  return new Promise((resolve, reject) => {
    // eslint-disable-next-line security/detect-non-literal-fs-filename
    fs.readFile(path.join(process.cwd(), fileName), 'utf8', function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}
