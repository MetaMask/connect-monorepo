/* eslint-disable @typescript-eslint/explicit-function-return-type -- Test helpers */

/**
 * Platform-specific selector helpers for e2e tests.
 *
 * These helpers provide a consistent interface for selecting elements
 * in e2e tests across different testing frameworks and platforms.
 */

import { TEST_IDS } from '.';

/**
 * Browser-specific selector helpers for e2e tests.
 * Uses data-testid attribute selectors (Playwright, Cypress, etc.).
 */
export const browserSelectors = {
  /**
   * Creates a CSS selector for data-testid attribute.
   *
   * @param testId - The test ID to select
   * @returns CSS selector string
   */
  byTestId: (testId: string) => `[data-testid="${testId}"]`,

  /**
   * Creates a CSS selector for id attribute.
   *
   * @param id - The element ID to select
   * @returns CSS selector string
   */
  byId: (id: string) => `#${id}`,

  // Convenience methods for common patterns
  scopeCard: (scope: string) =>
    `[data-testid="${TEST_IDS.scopeCard.card(scope)}"]`,
  connectBtn: (type?: string) =>
    `[data-testid="${TEST_IDS.app.btnConnect(type)}"]`,
  disconnectBtn: () => `[data-testid="${TEST_IDS.app.btnDisconnect}"]`,
};

/**
 * React Native-specific selector helpers for e2e tests (Detox/Maestro).
 * Uses testID attribute directly.
 */
export const rnSelectors = {
  /**
   * Returns the testID string for React Native element selection.
   *
   * @param testId - The test ID to select
   * @returns The testID string
   */
  byTestId: (testId: string) => testId,

  // Convenience methods
  scopeCard: (scope: string) => TEST_IDS.scopeCard.card(scope),
  connectBtn: (type?: string) => TEST_IDS.app.btnConnect(type),
  disconnectBtn: () => TEST_IDS.app.btnDisconnect,
};
