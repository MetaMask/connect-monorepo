/**
 * React Native UI module entry point
 */
import { BaseModalFactory } from './ModalFactory';
import { preload } from './preload.native';
import type { FactoryModals } from './modals/types';

export { preload };

/**
 * ModalFactory for React Native environments.
 * No-op preload since Stencil web components are not used.
 */
export class ModalFactory<T extends FactoryModals = FactoryModals> extends BaseModalFactory<T> {
  protected async preload(): Promise<void> {
    return preload();
  }
}
