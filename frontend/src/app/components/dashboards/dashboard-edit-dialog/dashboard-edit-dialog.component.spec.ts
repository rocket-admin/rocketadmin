import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { DashboardEditDialogComponent } from './dashboard-edit-dialog.component';

describe('DashboardEditDialogComponent', () => {
	let component: DashboardEditDialogComponent;
	let fixture: ComponentFixture<DashboardEditDialogComponent>;
	let mockDashboardsService: Partial<DashboardsService>;

	beforeEach(async () => {
		mockDashboardsService = {
			createDashboard: vi.fn(),
			updateDashboard: vi.fn(),
		} as Partial<DashboardsService>;

		await TestBed.configureTestingModule({
			imports: [DashboardEditDialogComponent, BrowserAnimationsModule, Angulartics2Module.forRoot()],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{ provide: MAT_DIALOG_DATA, useValue: { connectionId: 'test-conn', dashboard: null } },
				{ provide: MatDialogRef, useValue: { close: vi.fn() } },
				{ provide: DashboardsService, useValue: mockDashboardsService },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(DashboardEditDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
