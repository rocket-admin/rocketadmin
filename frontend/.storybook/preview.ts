import { provideHttpClient } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { provideCodeEditor } from '@ngstack/code-editor';
import type { Preview } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';
import { Angulartics2Module } from 'angulartics2';
import { provideMarkdown } from 'ngx-markdown';

const preview: Preview = {
	decorators: [
		applicationConfig({
			providers: [
				provideAnimations(),
				provideHttpClient(),
				provideRouter([]),
				importProvidersFrom(Angulartics2Module.forRoot()),
				provideMarkdown(),
				provideCodeEditor({
					baseUrl: 'assets/monaco',
				}),
			],
		}),
	],
};

export default preview;
