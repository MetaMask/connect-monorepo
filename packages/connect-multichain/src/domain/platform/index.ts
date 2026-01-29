/* eslint-disable @typescript-eslint/explicit-function-return-type */
/* eslint-disable no-restricted-globals */
/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable import-x/no-named-as-default-member -- Bowser.parse is the intended API */
import Bowser from 'bowser';

export enum PlatformType {
  // React Native or Nodejs
  NonBrowser = 'nodejs',
  // MetaMask Mobile in-app browser
  MetaMaskMobileWebview = 'in-app-browser',
  // Desktop Browser
  DesktopWeb = 'web-desktop',
  // Mobile Browser
  MobileWeb = 'web-mobile',
  // ReactNative
  ReactNative = 'react-native',
}

function isNotBrowser(): boolean {
  if (typeof window === 'undefined') {
    return true;
  }
  if (!window?.navigator) {
    return true;
  }
  if (
    typeof global !== 'undefined' &&
    global?.navigator?.product === 'ReactNative'
  ) {
    return true;
  }
  return navigator?.product === 'ReactNative';
}

function isReactNative(): boolean {
  const hasWindowNavigator =
    typeof window !== 'undefined' && window.navigator !== undefined;
  const nav = hasWindowNavigator ? window.navigator : undefined;

  if (!nav) {
    return false;
  }

  return hasWindowNavigator && window.navigator?.product === 'ReactNative';
}

function isMetaMaskMobileWebView(): boolean {
  return (
    typeof window !== 'undefined' &&
    // @ts-expect-error ReactNativeWebView should be defined
    Boolean(window.ReactNativeWebView) &&
    Boolean(window.navigator.userAgent.endsWith('MetaMaskMobile'))
  );
}

function isMobile(): boolean {
  const browser = Bowser.parse(window.navigator.userAgent);
  return (
    browser?.platform?.type === 'mobile' || browser?.platform?.type === 'tablet'
  );
}

export function getPlatformType(): PlatformType {
  if (isReactNative()) {
    return PlatformType.ReactNative;
  }
  if (isNotBrowser()) {
    return PlatformType.NonBrowser;
  }
  if (isMetaMaskMobileWebView()) {
    return PlatformType.MetaMaskMobileWebview;
  }
  if (isMobile()) {
    return PlatformType.MobileWeb;
  }
  return PlatformType.DesktopWeb;
}

/**
 * Check if MetaMask extension is installed
 *
 * @returns True if extension is installed, false otherwise
 */
export function isMetamaskExtensionInstalled(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  // @ts-expect-error ethereum should be defined
  return Boolean(window.ethereum?.isMetaMask);
}

export function isSecure(): boolean {
  const platformType = getPlatformType();
  return isReactNative() || platformType === PlatformType.MobileWeb;
}

// Immediately start MetaMask detection when module loads
const detectionPromise: Promise<boolean> = (async () => {
  const pt = getPlatformType();
  if (pt === PlatformType.NonBrowser || pt === PlatformType.ReactNative) {
    return Promise.resolve(false);
  }

  return new Promise((resolve) => {
    const providers: any[] = [];

    const handler = (event: any) => {
      if (event?.detail?.info?.rdns) {
        providers.push(event.detail);
      }
    };

    window.addEventListener('eip6963:announceProvider', handler);
    window.dispatchEvent(new Event('eip6963:requestProvider'));

    setTimeout(() => {
      window.removeEventListener('eip6963:announceProvider', handler);

      const hasMetaMask = providers.some((provider) =>
        provider?.info?.rdns?.startsWith('io.metamask'),
      );

      resolve(hasMetaMask);
    }, 300); // default timeout
  });
})();

export async function hasExtension(): Promise<boolean> {
  return detectionPromise;
}
