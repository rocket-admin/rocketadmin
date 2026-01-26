/// <reference types="vitest/globals" />
import 'zone.js';
import 'zone.js/testing';
import { TestBed } from '@angular/core/testing';
import { BrowserDynamicTestingModule, platformBrowserDynamicTesting } from '@angular/platform-browser-dynamic/testing';
import { vi } from 'vitest';

// Initialize Angular testing environment
try {
	TestBed.initTestEnvironment(BrowserDynamicTestingModule, platformBrowserDynamicTesting());
} catch (e) {
	// TestBed already initialized
}

// Expose vi globally for tests that need it
(globalThis as any).vi = vi;
