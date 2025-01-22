import { Module, Global } from '@nestjs/common';
import * as nunjucks from 'nunjucks';
import { BaseType } from '../../../../common/data-injection.tokens.js';
import path from 'path';
import { fileURLToPath } from 'url';
import { join } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

@Global()
@Module({
  providers: [
    {
      provide: BaseType.NUNJUCKS,
      useFactory: () => {
        const env = new nunjucks.Environment(new nunjucks.FileSystemLoader(join(__dirname, '..', 'templates')));
        return env;
      },
    },
  ],
  exports: [BaseType.NUNJUCKS],
})
export class NunjucksModule {}
