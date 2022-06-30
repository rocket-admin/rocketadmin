import { AddRowInTableDs } from './add-row-in-table.ds';

export class UpdateRowInTableDs extends AddRowInTableDs {
  constructor() {
    super();
  }
  primaryKey: Record<string, unknown>;
}
