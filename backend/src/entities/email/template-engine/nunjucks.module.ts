import { Module, Global } from '@nestjs/common';
import * as nunjucks from 'nunjucks';
import { BaseType } from '../../../common/data-injection.tokens.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { isTest } from '../../../helpers/app/is-test.js';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@Global()
@Module({
  providers: [
    {
      provide: BaseType.NUNJUCKS,
      useFactory: () => {
        const pathToTemplates = isTest()
          ? process.cwd() + '/public/email-templates'
          : path.join(__dirname, '..', '..', '..', '..', 'public', 'email-templates');
        const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(pathToTemplates));
        return env;
      },
    },
  ],
  exports: [BaseType.NUNJUCKS],
})
export class NunjucksModule {}
