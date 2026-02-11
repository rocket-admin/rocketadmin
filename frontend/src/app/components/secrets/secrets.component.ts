import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Title } from '@angular/platform-browser';
import { Angulartics2 } from 'angulartics2';
import posthog from 'posthog-js';
import { Subject, Subscription } from 'rxjs';
import { debounceTime, distinctUntilChanged } from 'rxjs/operators';
import { Secret, SecretPagination } from 'src/app/models/secret';
import { CompanyService } from 'src/app/services/company.service';
import { SecretsService } from 'src/app/services/secrets.service';
import { ProfileSidebarComponent } from '../profile/profile-sidebar/profile-sidebar.component';
import { PlaceholderTableDataComponent } from '../skeletons/placeholder-table-data/placeholder-table-data.component';
import { AlertComponent } from '../ui-components/alert/alert.component';
import { AuditLogDialogComponent } from './audit-log-dialog/audit-log-dialog.component';
import { CreateSecretDialogComponent } from './create-secret-dialog/create-secret-dialog.component';
import { DeleteSecretDialogComponent } from './delete-secret-dialog/delete-secret-dialog.component';
import { EditSecretDialogComponent } from './edit-secret-dialog/edit-secret-dialog.component';

@Component({
	selector: 'app-secrets',
	templateUrl: './secrets.component.html',
	styleUrls: ['./secrets.component.css'],
	imports: [
		CommonModule,
		FormsModule,
		MatTableModule,
		MatButtonModule,
		MatIconModule,
		MatMenuModule,
		MatInputModule,
		MatFormFieldModule,
		MatPaginatorModule,
		MatTooltipModule,
		MatChipsModule,
		MatDividerModule,
		PlaceholderTableDataComponent,
		AlertComponent,
		ProfileSidebarComponent,
	],
})
export class SecretsComponent implements OnInit, OnDestroy {
	public secrets: Secret[] = [];
	public pagination: SecretPagination = {
		total: 0,
		currentPage: 1,
		perPage: 20,
		lastPage: 1,
	};
	public loading = true;
	public searchQuery = '';
	public displayedColumns = ['slug', 'masterEncryption', 'expiresAt', 'updatedAt', 'actions'];
	public subscriptions: Subscription[] = [];

	private searchSubject = new Subject<string>();

	constructor(
		private _secrets: SecretsService,
		private _company: CompanyService,
		private dialog: MatDialog,
		private angulartics2: Angulartics2,
		private title: Title,
	) {}

	ngOnInit(): void {
		this._company.getCurrentTabTitle().subscribe((tabTitle) => {
			this.title.setTitle(`Secrets | ${tabTitle || 'Rocketadmin'}`);
		});

		this.loadSecrets();

		const searchSub = this.searchSubject.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
			this.pagination.currentPage = 1;
			this.loadSecrets();
		});
		this.subscriptions.push(searchSub);

		const updateSub = this._secrets.cast.subscribe((action) => {
			if (action) {
				this.loadSecrets();
			}
		});
		this.subscriptions.push(updateSub);
	}

	ngOnDestroy(): void {
		this.subscriptions.forEach((sub) => sub.unsubscribe());
	}

	loadSecrets(): void {
		this.loading = true;
		this._secrets
			.fetchSecrets(this.pagination.currentPage, this.pagination.perPage, this.searchQuery || undefined)
			.subscribe((response) => {
				if (response) {
					this.secrets = response.data;
					this.pagination = response.pagination;
				}
				this.loading = false;
			});
	}

	onSearchChange(query: string): void {
		this.searchSubject.next(query);
	}

	onPageChange(event: PageEvent): void {
		this.pagination.currentPage = event.pageIndex + 1;
		this.pagination.perPage = event.pageSize;
		this.loadSecrets();
	}

	isExpired(secret: Secret): boolean {
		if (!secret.expiresAt) return false;
		return new Date(secret.expiresAt) < new Date();
	}

	isExpiringSoon(secret: Secret): boolean {
		if (!secret.expiresAt) return false;
		const expiresAt = new Date(secret.expiresAt);
		const now = new Date();
		const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
		return expiresAt > now && expiresAt <= sevenDaysFromNow;
	}

	openCreateDialog(): void {
		this.dialog.open(CreateSecretDialogComponent, {
			width: '500px',
		});
		this.angulartics2.eventTrack.next({
			action: 'Secrets: create secret dialog opened',
		});
		posthog.capture('Secrets: create secret dialog opened');
	}

	openEditDialog(secret: Secret): void {
		this.dialog.open(EditSecretDialogComponent, {
			width: '500px',
			data: { secret },
		});
		this.angulartics2.eventTrack.next({
			action: 'Secrets: edit secret dialog opened',
		});
		posthog.capture('Secrets: edit secret dialog opened');
	}

	openDeleteDialog(secret: Secret): void {
		this.dialog.open(DeleteSecretDialogComponent, {
			width: '400px',
			data: { secret },
		});
		this.angulartics2.eventTrack.next({
			action: 'Secrets: delete secret dialog opened',
		});
		posthog.capture('Secrets: delete secret dialog opened');
	}

	openAuditLogDialog(secret: Secret): void {
		this.dialog.open(AuditLogDialogComponent, {
			width: '800px',
			maxHeight: '80vh',
			data: { secret },
		});
		this.angulartics2.eventTrack.next({
			action: 'Secrets: audit log dialog opened',
		});
		posthog.capture('Secrets: audit log dialog opened');
	}
}
