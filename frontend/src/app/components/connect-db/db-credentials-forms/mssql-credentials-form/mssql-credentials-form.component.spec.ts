import { provideHttpClient } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormsModule } from '@angular/forms';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';
import { MssqlCredentialsFormComponent } from './mssql-credentials-form.component';

describe('MssqlCredentialsFormComponent', () => {
	let component: MssqlCredentialsFormComponent;
	let fixture: ComponentFixture<MssqlCredentialsFormComponent>;

	beforeEach(async () => {
		await TestBed.configureTestingModule({
			imports: [
				FormsModule,
				MatCheckboxModule,
				BrowserAnimationsModule,
				Angulartics2Module.forRoot({}),
				MssqlCredentialsFormComponent,
			],
			providers: [provideHttpClient()],
		}).compileComponents();

		fixture = TestBed.createComponent(MssqlCredentialsFormComponent);
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
