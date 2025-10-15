import { Modal, type OTPCode, type OTPCodeWidgetProps } from '../../../domain';

export abstract class AbstractOTPCodeModal extends Modal<OTPCodeWidgetProps, OTPCode> {
    protected instance?: HTMLElement | undefined;

	get otpCode() {
		return this.data;
	}

	set otpCode(code: string) {
		this.data = code;
	}

	updateOTPCode(code: string) {
		this.otpCode = code;
		if (this.instance) {
			(this.instance as any).otpCode = code;
		}
	}
}
