import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CassandraCredentialsFormComponent } from './cassandra-credentials-form.component';

describe('CassandraCredentialsFormComponent', () => {
  let component: CassandraCredentialsFormComponent;
  let fixture: ComponentFixture<CassandraCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CassandraCredentialsFormComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CassandraCredentialsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
