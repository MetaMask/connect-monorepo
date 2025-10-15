import { type ConnectionRequest, createLogger, type QRLink } from '../../../domain';
import { AbstractInstallModal } from '../base/AbstractInstallModal';
import { formatRemainingTime, shouldLogCountdown } from '../base/utils';

const logger = createLogger('metamask-sdk:ui');

export class InstallModal extends AbstractInstallModal {
  private async displayQRWithCountdown(qrCodeLink: QRLink, expiresInMs: number) {
		const isExpired = expiresInMs <= 0;
		const formattedTime = formatRemainingTime(expiresInMs);
    let qrCode: string;
    try {
      // Dynamic import at runtime to avoid ESM/CJS type conflicts
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const mod = await import('@paulmillr/qr');
      qrCode = (mod.default as any)(qrCodeLink, 'ascii');
    } catch {
      qrCode = '[QR code unavailable]';
    }

		// Clear console and display QR code with live countdown
		console.clear();
		console.log(qrCode);

		if (isExpired) {
			console.log('EXPIRED - Generating new QR code...');
		} else {
			console.log(`EXPIRES IN: ${formattedTime}`);
		}
	}

	renderQRCode(link: QRLink, connectionRequest: ConnectionRequest): void {
		const { sessionRequest } = connectionRequest;
		const expiresIn = sessionRequest.expiresAt - Date.now();
		const expiresInSeconds = Math.floor(expiresIn / 1000);
		const shouldLog = shouldLogCountdown(expiresInSeconds);
		const formattedTime = formatRemainingTime(expiresIn);
		this.startExpirationCheck(connectionRequest);

		this.displayQRWithCountdown(link, expiresIn);

		if (shouldLog) {
			logger(`[UI: InstallModal-nodejs()] QR code expires in: ${formattedTime} (${expiresIn}ms)`);
		}
	}

	mount() {
		if (!this.link) {
			throw new Error('Session request is required');
		}
		const { link, connectionRequest } = this;
		this.renderQRCode(link, connectionRequest);
	}

	unmount(): void {
		console.clear();
		this.stopExpirationCheck();
	}
}
