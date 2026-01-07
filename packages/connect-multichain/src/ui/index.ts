/**
 * Browser/Web UI module entry point
 */
import { BaseModalFactory } from './ModalFactory';
import type { FactoryModals } from './modals/types';

/**
 * Web-specific preload that loads Stencil custom elements
 */
export async function preload(): Promise<void> {
  if (typeof document === 'undefined') {
    return;
  }
  try {
    const { defineCustomElements } = await import(
      '@metamask/multichain-ui/loader'
    );
    await defineCustomElements();
  } catch (error) {
    console.error('Failed to load customElements:', error);
  }
}

/**
 * ModalFactory for browser/web environments.
 * Loads Stencil web components via dynamic import.
 */
export class ModalFactory<
  T extends FactoryModals = FactoryModals,
> extends BaseModalFactory<T> {
  protected async preload(): Promise<void> {
    return preload();
  }
}
