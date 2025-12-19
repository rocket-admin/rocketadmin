import { AddRowInTableDs } from './add-row-in-table.ds.js';

export class UpdateRowInTableDs extends AddRowInTableDs {
  primaryKey: Record<string, unknown>;
}
