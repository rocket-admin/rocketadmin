import { AddRowInTableDs } from './add-row-in-table.ds.js';

export class UpdateRowInTableDs extends AddRowInTableDs {
  constructor() {
    super();
  }
  primaryKey: Record<string, unknown>;
}
