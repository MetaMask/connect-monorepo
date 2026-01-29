/* eslint-disable @typescript-eslint/explicit-function-return-type -- Getters/setters have inferred types */
/* eslint-disable require-atomic-updates -- False positive: connectionRequest is reassigned atomically */
/* eslint-disable @typescript-eslint/no-misused-promises -- setInterval callback is async intentionally */
import { formatRemainingTime, shouldLogCountdown } from './utils';
import {
  type ConnectionRequest,
  createLogger,
  type InstallWidgetProps,
  Modal,
  type QRLink,
} from '../../../domain';

const logger = createLogger('metamask-sdk:ui');

export abstract class AbstractInstallModal extends Modal<InstallWidgetProps> {
  protected instance?: HTMLMmInstallModalElement | undefined;

  #expirationInterval: NodeJS.Timeout | null = null;

  #lastLoggedCountdown: number = -1;

  abstract renderQRCode(
    link: QRLink,
    connectionRequest: ConnectionRequest,
  ): void;

  get link() {
    return this.data;
  }

  set link(link: QRLink) {
    this.data = link;
  }

  get connectionRequest() {
    return this.options.connectionRequest;
  }

  set connectionRequest(connectionRequest: ConnectionRequest) {
    this.options.connectionRequest = connectionRequest;
  }

  protected updateLink(link: QRLink) {
    this.link = link;
    if (this.instance) {
      this.instance.link = link;
    }
  }

  protected updateExpiresIn(expiresIn: number) {
    if (expiresIn >= 0 && this.instance) {
      this.instance.expiresIn = expiresIn;
    }
  }

  protected startExpirationCheck(connectionRequest: ConnectionRequest): void {
    this.stopExpirationCheck();

    let currentConnectionRequest: ConnectionRequest = connectionRequest;

    this.#expirationInterval = setInterval(async () => {
      const { sessionRequest } = currentConnectionRequest;
      const now = Date.now();
      const remainingMs = sessionRequest.expiresAt - now;

      const remainingSeconds = Math.floor(remainingMs / 1000);

      if (
        remainingMs > 0 &&
        shouldLogCountdown(remainingSeconds) &&
        this.#lastLoggedCountdown !== remainingSeconds
      ) {
        const formattedTime = formatRemainingTime(remainingMs);
        logger(
          `[UI: InstallModal-nodejs()] QR code expires in: ${formattedTime} (${remainingSeconds}s)`,
        );
        this.#lastLoggedCountdown = remainingSeconds;
      }

      if (now >= sessionRequest.expiresAt) {
        this.stopExpirationCheck();
        logger(
          '[UI: InstallModal-nodejs()] ⏰ QR code EXPIRED! Generating new one...',
        );
        try {
          // Generate new session request
          currentConnectionRequest =
            await this.options.createConnectionRequest();
          const generateQRCode = await this.options.generateQRCode(
            currentConnectionRequest,
          );
          this.#lastLoggedCountdown = -1; // Reset countdown logging

          // Update local instances with new data
          this.updateLink(generateQRCode);
          this.updateExpiresIn(remainingSeconds);

          // Render QRCode on each platform
          this.renderQRCode(generateQRCode, currentConnectionRequest);
        } catch (error) {
          logger(
            `[UI: InstallModal-nodejs()] ❌ Error generating new QR code: ${error}`,
          );
        }
      }
    }, 1000);
  }

  protected stopExpirationCheck(): void {
    if (this.#expirationInterval) {
      clearInterval(this.#expirationInterval);
      this.#expirationInterval = null;
      logger(
        '[UI: InstallModal-nodejs()] 🛑 Stopped QR code expiration checking',
      );
    }
  }
}
