import fs from 'fs';
import path from 'path';

export async function readFileUtil(fileName): Promise<string> {
  return new Promise((resolve, reject) => {
    fs.readFile(path.join(process.cwd(), fileName), 'utf8', function (err, data) {
      if (err) {
        reject(err);
      }
      resolve(data);
    });
  });
}
