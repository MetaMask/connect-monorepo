/* eslint-disable no-restricted-globals -- Web modal uses document */
import type { MmInstallModalCustomEvent } from '@metamask/multichain-ui';

import { AbstractInstallModal } from '../base/AbstractInstallModal';

export class InstallModal extends AbstractInstallModal {
  renderQRCode(): void {
    // Not needed for web as its using install Modal
  }

  mount(): void {
    const { options } = this;
    const modal = document.createElement(
      'mm-install-modal',
    ) as HTMLMmInstallModalElement;

    modal.showInstallModal = options.showInstallModal;
    modal.sdkVersion = options.sdkVersion;
    modal.addEventListener('close', (ev: Event) => {
      const { detail } = ev as MmInstallModalCustomEvent<{
        shouldTerminate?: boolean;
      }>;
      options.onClose(detail?.shouldTerminate);
    });
    modal.addEventListener(
      'startDesktopOnboarding',
      options.startDesktopOnboarding,
    );
    modal.link = options.link;

    this.instance = modal;
    options.parentElement?.appendChild(modal);

    this.startExpirationCheck(options.connectionRequest);
  }

  unmount(): void {
    const { options, instance: modal } = this;
    this.stopExpirationCheck();
    if (modal && options.parentElement?.contains(modal)) {
      options.parentElement.removeChild(modal);
      this.instance = undefined;
    }
  }
}
