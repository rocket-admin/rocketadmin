import { BaseTableFieldDisplayComponent } from './base-table-display-field/base-table-field-display.component';
import { BooleanDisplayComponent } from './boolean/boolean.component';
import { ForeignKeyDisplayComponent } from './foreign-key/foreign-key.component';
import { IdDisplayComponent } from './id/id.component';
import { LongTextDisplayComponent } from './long-text/long-text.component';
import { TextDisplayComponent } from './text/text.component';

export const DisplayComponents = {
  'text': TextDisplayComponent,
  'long_text': LongTextDisplayComponent,
  'id': IdDisplayComponent,
  'boolean': BooleanDisplayComponent,
  'foreign key': ForeignKeyDisplayComponent,
  // Add additional components as needed
  // These should match the types used in tableTypes object
};

export {
  BaseTableFieldDisplayComponent,
  TextDisplayComponent,
  LongTextDisplayComponent,
  IdDisplayComponent,
  BooleanDisplayComponent,
  ForeignKeyDisplayComponent
};
