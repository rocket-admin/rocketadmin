const fs = require('fs');
const path = require('path');

// Read package.json to get the version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

// Update the version.ts file
const versionTsPath = path.join(__dirname, '..', 'src', 'app', 'version.ts');
const versionTsContent = `// This file is auto-generated during build
export const version = '${version}';
`;

fs.writeFileSync(versionTsPath, versionTsContent);
console.log(`Updated version.ts with version ${version}`);