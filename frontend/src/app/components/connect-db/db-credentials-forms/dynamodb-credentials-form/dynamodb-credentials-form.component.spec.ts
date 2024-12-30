import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DynamodbCredentialsFormComponent } from './dynamodb-credentials-form.component';
import { FormsModule } from '@angular/forms';
import { Angulartics2Module } from 'angulartics2';
import { provideHttpClient } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

describe('DynamodbCredentialsFormComponent', () => {
  let component: DynamodbCredentialsFormComponent;
  let fixture: ComponentFixture<DynamodbCredentialsFormComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
    imports: [
        FormsModule,
        BrowserAnimationsModule,
        Angulartics2Module.forRoot({}),
        DynamodbCredentialsFormComponent
    ],
    providers: [provideHttpClient()]
})
    .compileComponents();

    fixture = TestBed.createComponent(DynamodbCredentialsFormComponent);
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
