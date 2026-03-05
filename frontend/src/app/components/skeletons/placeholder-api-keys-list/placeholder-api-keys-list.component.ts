import { NgFor } from '@angular/common';
import { Component } from '@angular/core';

@Component({
	selector: 'app-placeholder-api-keys-list',
	templateUrl: './placeholder-api-keys-list.component.html',
	styleUrls: ['./placeholder-api-keys-list.component.css'],
	imports: [NgFor],
})
export class PlaceholderApiKeysListComponent {}
