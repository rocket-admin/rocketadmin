import { Component, computed, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { UsersService } from '../../services/users.service';
import { ViewAsService } from '../../services/view-as.service';

@Component({
	selector: 'app-view-as-banner',
	imports: [MatButtonModule, MatIconModule],
	templateUrl: './view-as-banner.component.html',
	styleUrls: ['./view-as-banner.component.css'],
})
export class ViewAsBannerComponent {
	private _viewAs = inject(ViewAsService);
	private _usersService = inject(UsersService);

	protected isActive = this._viewAs.isActive;

	protected groupLabel = computed(() => {
		const id = this._viewAs.viewAsGroupId();
		if (!id) return '';
		const match = this._usersService.groups().find((gi) => gi.group.id === id);
		if (match) return match.group.title;
		// Group list not loaded for this connection — fall back to a truncated id
		return id.length > 8 ? `${id.slice(0, 8)}…` : id;
	});

	exit(): void {
		this._viewAs.clearViewAs();
	}
}
