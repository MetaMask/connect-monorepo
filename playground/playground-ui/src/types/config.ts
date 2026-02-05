/**
 * Configuration options for playground applications.
 * These values can be injected at runtime to configure platform-specific behavior.
 */
export type PlaygroundConfig = {
  /** API key for Helius Solana RPC */
  heliusApiKey?: string;
  /** API key for Infura */
  infuraApiKey?: string;
  /** Custom domain for signIn operations (defaults to window.location.host in browser) */
  signInDomain?: string;
};

/**
 * Platform-specific adapter functions.
 * Consumers provide these implementations based on their runtime environment.
 */
export type PlatformAdapter = {
  /**
   * Converts a string to base64 encoding.
   * Browser: Use btoa() or TextEncoder + btoa
   * React Native: Use Buffer.from(str).toString('base64')
   */
  stringToBase64?: (input: string) => string;

  /**
   * Converts a Uint8Array to base64 encoding.
   * Browser: Use btoa(String.fromCharCode(...))
   * React Native: Use Buffer.from(arr).toString('base64')
   */
  uint8ArrayToBase64?: (input: Uint8Array) => string;

  /**
   * Opens a URL in the platform's default handler.
   * Browser: window.open() or location.href
   * React Native: Linking.openURL()
   */
  openLink?: (url: string) => void;

  /**
   * Gets the current hostname.
   * Browser: window.location.host
   * React Native: Return a default value like 'metamask.io'
   */
  getHostname?: () => string;

  /**
   * Shows an alert message.
   * Browser: window.alert()
   * React Native: Alert.alert() or return error string
   */
  showAlert?: (message: string) => void;
};

/**
 * Function type for base64 encoding.
 */
export type Base64Encoder = (input: string | Uint8Array) => string;
