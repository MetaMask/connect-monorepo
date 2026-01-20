import { describe, it, expect, beforeEach } from 'vitest';

import {
  setConfig,
  getConfig,
  resetConfig,
  setPlatformAdapter,
  getPlatformAdapter,
  resetPlatformAdapter,
  stringToBase64,
  getHostname,
} from './index';

describe('config', () => {
  beforeEach(() => {
    resetConfig();
  });

  describe('setConfig / getConfig', () => {
    it('should set and get configuration', () => {
      setConfig({ heliusApiKey: 'test-key' });

      expect(getConfig()).toEqual({ heliusApiKey: 'test-key' });
    });

    it('should merge configuration values', () => {
      setConfig({ heliusApiKey: 'test-key' });
      setConfig({ infuraApiKey: 'infura-key' });

      expect(getConfig()).toEqual({
        heliusApiKey: 'test-key',
        infuraApiKey: 'infura-key',
      });
    });

    it('should override existing values', () => {
      setConfig({ heliusApiKey: 'old-key' });
      setConfig({ heliusApiKey: 'new-key' });

      expect(getConfig()).toEqual({ heliusApiKey: 'new-key' });
    });
  });

  describe('resetConfig', () => {
    it('should reset to empty state', () => {
      setConfig({ heliusApiKey: 'test-key' });
      resetConfig();

      expect(getConfig()).toEqual({});
    });
  });
});

describe('platformAdapter', () => {
  beforeEach(() => {
    resetPlatformAdapter();
  });

  describe('setPlatformAdapter / getPlatformAdapter', () => {
    it('should set and get platform adapter', () => {
      const encoder = (str: string) => `encoded:${str}`;
      setPlatformAdapter({ stringToBase64: encoder });

      expect(getPlatformAdapter().stringToBase64).toBe(encoder);
    });

    it('should merge adapter functions', () => {
      const encoder = (str: string) => `encoded:${str}`;
      const hostname = () => 'test.com';

      setPlatformAdapter({ stringToBase64: encoder });
      setPlatformAdapter({ getHostname: hostname });

      const adapter = getPlatformAdapter();
      expect(adapter.stringToBase64).toBe(encoder);
      expect(adapter.getHostname).toBe(hostname);
    });
  });

  describe('stringToBase64', () => {
    it('should use configured encoder', () => {
      setPlatformAdapter({ stringToBase64: (str) => `custom:${str}` });

      expect(stringToBase64('test')).toBe('custom:test');
    });

    it('should fall back to btoa if available', () => {
      // btoa is available in jsdom environment
      const result = stringToBase64('hello');
      expect(result).toBe('aGVsbG8='); // base64 of 'hello'
    });
  });

  describe('getHostname', () => {
    it('should use configured hostname getter', () => {
      setPlatformAdapter({ getHostname: () => 'custom.host.com' });

      expect(getHostname()).toBe('custom.host.com');
    });

    it('should fall back to default in non-browser environment', () => {
      // In test environment without window.location, should return default
      const hostname = getHostname();
      expect(typeof hostname).toBe('string');
    });
  });
});
