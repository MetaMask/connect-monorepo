import { Modal, type OTPCodeWidgetProps } from '../../../domain';

export abstract class AbstractOTPCodeModal extends Modal<OTPCodeWidgetProps> {
  protected instance?: HTMLMmOtpModalElement | undefined;

  get otpCode(): string {
    return this.data;
  }

  set otpCode(code: string) {
    this.data = code;
  }

  updateOTPCode(code: string): void {
    this.otpCode = code;
    if (this.instance) {
      this.instance.otpCode = code;
    }
  }
}
