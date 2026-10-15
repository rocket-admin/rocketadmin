// Port of frontend/scripts/update-version.js: writes the package.json version to src/version.ts.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = packageJson.version;

const versionTsPath = path.join(root, 'src', 'version.ts');
const versionTsContent = `// This file is auto-generated during build
export const version = '${version}';
`;

fs.writeFileSync(versionTsPath, versionTsContent);
console.log(`Updated version.ts with version ${version}`);
