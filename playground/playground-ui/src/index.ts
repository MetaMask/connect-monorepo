/* eslint-disable import-x/export -- Re-export pattern for package */
/**
 * @module playground-ui
 *
 * Shared UI logic and utilities for MetaMask playground applications.
 * This package provides common constants, helpers, types, and configuration
 * utilities that are shared between the browser and React Native playgrounds.
 */

// Re-export all modules
export * from './constants';
export * from './helpers';
export * from './types';
export * from './config';
export * from './testIds';
export { escapeTestId, createTestId } from './utils/testId';
