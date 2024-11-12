import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MysqlCredentialsFormComponent } from './mysql-credentials-form.component';

describe('MysqlCredentialsFormComponent', () => {
  let component: MysqlCredentialsFormComponent;
  let fixture: ComponentFixture<MysqlCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MysqlCredentialsFormComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(MysqlCredentialsFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
