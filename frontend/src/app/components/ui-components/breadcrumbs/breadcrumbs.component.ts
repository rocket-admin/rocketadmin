import { Component, input } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

interface Breadcrumb {
	label: string;
	link?: string | null;
	queryParams?: Record<string, string>;
}

@Component({
	selector: 'app-breadcrumbs',
	templateUrl: './breadcrumbs.component.html',
	styleUrls: ['./breadcrumbs.component.css'],
	standalone: true,
	imports: [RouterModule, MatIconModule, MatButtonModule],
})
export class BreadcrumbsComponent {
	crumbs = input<Breadcrumb[]>([]);
}
