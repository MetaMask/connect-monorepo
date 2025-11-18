declare module '@paulmillr/qr';

export declare const mmsdk: any;
declare global {
  type Window = {
    /**
     * TODO: Add types for the window object to manage connection with inApp browser, etc
     */
    ReactNativeWebView?: any;
    mmsdk?: any;
    ethereum?: {
      isMetaMask?: boolean;
      request?: (request: { method: string; params?: any[] }) => Promise<any>;
      on?: (eventName: string, handler: (...args: any[]) => void) => void;
      removeListener?: (
        eventName: string,
        handler: (...args: any[]) => void,
      ) => void;
    };
  };
}

declare global {
  /**
   * Minimal typings for Stencil custom elements used by this package.
   * These are provided to ensure the multichain package compiles even when
   * consuming projects do not load the full Stencil-generated global types.
   */
  type HTMLMmInstallModalElement = HTMLElement & {
    showInstallModal: boolean;
    sdkVersion?: string;
    link: string;
    expiresIn: number;
  };

  type HTMLMmOtpModalElement = HTMLElement & {
    sdkVersion?: string;
    otpCode: string;
    displayOTP?: boolean;
  };
}
