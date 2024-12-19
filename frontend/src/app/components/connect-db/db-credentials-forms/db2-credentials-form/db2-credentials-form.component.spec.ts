import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Db2CredentialsFormComponent } from './db2-credentials-form.component';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';

fdescribe('Db2CredentialsFormComponent', () => {
  let component: Db2CredentialsFormComponent;
  let fixture: ComponentFixture<Db2CredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        FormsModule,
        MatCheckboxModule,
        Db2CredentialsFormComponent
    ]
})
    .compileComponents();

    fixture = TestBed.createComponent(Db2CredentialsFormComponent);
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
