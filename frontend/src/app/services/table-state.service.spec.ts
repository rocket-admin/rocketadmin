import { TestBed } from '@angular/core/testing';

import { TableStateService } from './table-state.service';

describe('TableStateService', () => {
  let service: TableStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TableStateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
