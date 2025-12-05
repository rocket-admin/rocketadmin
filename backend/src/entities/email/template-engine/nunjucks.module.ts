import { Module, Global } from '@nestjs/common';
import * as nunjucks from 'nunjucks';
import { BaseType } from '../../../common/data-injection.tokens.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { existsSync } from 'node:fs';
import assert from 'assert';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const pathToTemplates = path.join(__dirname, '..', '..', '..', '..', '..', 'public', 'email-templates');
assert(existsSync(pathToTemplates), `Email templates directory does not exist: ${__dirname} ${pathToTemplates}`);

@Global()
@Module({
  providers: [
    {
      provide: BaseType.NUNJUCKS,
      useFactory: () => {
        const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(pathToTemplates));
        return env;
      },
    },
  ],
  exports: [BaseType.NUNJUCKS],
})
export class NunjucksModule {}
