import fs from 'fs';
import path, { join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedCertificate: string | null = null;

export async function readSslCertificate(): Promise<string> {
	if (cachedCertificate) {
		return cachedCertificate;
	}
	const fileName = 'global-bundle.pem';
	return new Promise((resolve, reject) => {
		fs.readFile(
			join(__dirname, '..', '..', '..', '..', '..', 'files', 'certificates', fileName),
			'utf8',
			(err, data) => {
				if (err) {
					return reject(err);
				}
				cachedCertificate = data;
				resolve(data);
			},
		);
	});
}
