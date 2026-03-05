import { CommonModule } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterModule } from '@angular/router';

@Component({
	selector: 'app-breadcrumbs',
	templateUrl: './breadcrumbs.component.html',
	styleUrls: ['./breadcrumbs.component.css'],
	standalone: true,
	imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
})
export class BreadcrumbsComponent implements OnInit {
	@Input() crumbs;

	ngOnInit(): void {}
}
