import { provideHttpClient } from '@angular/common/http';
import { provideAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import type { Preview } from '@storybook/angular';
import { applicationConfig } from '@storybook/angular';

const preview: Preview = {
	decorators: [
		applicationConfig({
			providers: [provideAnimations(), provideHttpClient(), provideRouter([])],
		}),
	],
};

export default preview;
