import { ComponentFixture, TestBed } from '@angular/core/testing';

import { MysqlCredentialsFormComponent } from './mysql-credentials-form.component';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';

describe('MysqlCredentialsFormComponent', () => {
  let component: MysqlCredentialsFormComponent;
  let fixture: ComponentFixture<MysqlCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        FormsModule,
        MatCheckboxModule,
        MysqlCredentialsFormComponent
    ]
})
    .compileComponents();

    fixture = TestBed.createComponent(MysqlCredentialsFormComponent);
    component = fixture.componentInstance;

    component.connection = {
      id: "12345678"
    } as any;

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
