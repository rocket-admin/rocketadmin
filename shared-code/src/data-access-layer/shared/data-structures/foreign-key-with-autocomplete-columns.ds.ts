import { ForeignKeyDS } from './foreign-key.ds.js';

export class ForeignKeyWithAutocompleteColumnsDS extends ForeignKeyDS {
  autocomplete_columns: Array<string>;
}
