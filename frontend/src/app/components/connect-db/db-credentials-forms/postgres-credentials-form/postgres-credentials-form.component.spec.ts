import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PostgresCredentialsFormComponent } from './postgres-credentials-form.component';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';

describe('PostgresCredentialsFormComponent', () => {
  let component: PostgresCredentialsFormComponent;
  let fixture: ComponentFixture<PostgresCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        FormsModule,
        MatCheckboxModule,
        PostgresCredentialsFormComponent
    ]
})
    .compileComponents();

    fixture = TestBed.createComponent(PostgresCredentialsFormComponent);
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
