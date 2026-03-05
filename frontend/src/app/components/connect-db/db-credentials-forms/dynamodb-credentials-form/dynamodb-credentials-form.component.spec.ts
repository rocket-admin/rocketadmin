import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';
import { DynamodbCredentialsFormComponent } from './dynamodb-credentials-form.component';

describe('DynamodbCredentialsFormComponent', () => {
	let component: DynamodbCredentialsFormComponent;
	let fixture: ComponentFixture<DynamodbCredentialsFormComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [FormsModule, BrowserAnimationsModule, Angulartics2Module.forRoot({}), DynamodbCredentialsFormComponent],
			providers: [provideHttpClient()],
		}).compileComponents();

		fixture = TestBed.createComponent(DynamodbCredentialsFormComponent);
		component = fixture.componentInstance;

		component.connection = {
			id: '12345678',
		} as any;

		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
