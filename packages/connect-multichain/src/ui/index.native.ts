/* eslint-disable @typescript-eslint/naming-convention -- Type parameter T is a standard convention */
/**
 * React Native UI module entry point
 */
import { BaseModalFactory } from './ModalFactory';
import type { FactoryModals } from './modals/types';

/**
 * ModalFactory for React Native environments.
 * No-op preload since Stencil web components are not used.
 */
export class ModalFactory<
  T extends FactoryModals = FactoryModals,
> extends BaseModalFactory<T> {
  // No-op for React Native - web components are not applicable
  protected async preload(): Promise<void> {
    // No-op: React Native does not use web components
  }
}
