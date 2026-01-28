import { AbstractInstallModal } from '../base/AbstractInstallModal';

export class InstallModal extends AbstractInstallModal {
  renderQRCode(): void {
    // Not needed for RN (WORK IN Progress)
  }

  mount(): void {
    // No-op: React Native modal mounting handled by RN component
  }

  unmount(): void {
    // No-op: React Native modal unmounting handled by RN component
  }
}
