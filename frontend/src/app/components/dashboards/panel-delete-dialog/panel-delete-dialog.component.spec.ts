import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { Angulartics2Module } from 'angulartics2';
import { DashboardsService } from 'src/app/services/dashboards.service';
import { PanelDeleteDialogComponent } from './panel-delete-dialog.component';

describe('PanelDeleteDialogComponent', () => {
	let component: PanelDeleteDialogComponent;
	let fixture: ComponentFixture<PanelDeleteDialogComponent>;
	let mockDashboardsService: Partial<DashboardsService>;

	beforeEach(async () => {
		mockDashboardsService = {
			deleteWidget: vi.fn(),
		} as Partial<DashboardsService>;

		await TestBed.configureTestingModule({
			imports: [PanelDeleteDialogComponent, BrowserAnimationsModule, Angulartics2Module.forRoot()],
			providers: [
				provideHttpClient(),
				provideHttpClientTesting(),
				{
					provide: MAT_DIALOG_DATA,
					useValue: {
						connectionId: 'test-conn',
						dashboardId: 'test-dash',
						widget: { id: 'test-id', name: 'Test Widget' },
					},
				},
				{ provide: MatDialogRef, useValue: { close: vi.fn() } },
				{ provide: DashboardsService, useValue: mockDashboardsService },
			],
		}).compileComponents();

		fixture = TestBed.createComponent(PanelDeleteDialogComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
