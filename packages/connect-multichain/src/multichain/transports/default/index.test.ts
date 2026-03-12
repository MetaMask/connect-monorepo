/* eslint-disable id-length -- vitest alias */
/* eslint-disable no-restricted-globals -- Test environment mocks */
/* eslint-disable @typescript-eslint/naming-convention -- test mocks */
import * as t from 'vitest';

import { DefaultTransport } from '.';

t.vi.mock('@metamask/multichain-api-client', () => ({
  getDefaultTransport: () => ({
    connect: t.vi.fn().mockResolvedValue(undefined),
    request: t.vi.fn().mockResolvedValue({ result: null }),
    onNotification: t.vi.fn(),
    isConnected: t.vi.fn().mockReturnValue(false),
  }),
}));

t.describe('DefaultTransport', () => {
  let transport: DefaultTransport;
  let messageHandlers: ((event: MessageEvent) => void)[];

  t.beforeEach(() => {
    messageHandlers = [];

    t.vi.stubGlobal('window', {
      addEventListener: t.vi.fn(
        (_type: string, handler: (event: MessageEvent) => void) => {
          messageHandlers.push(handler);
        },
      ),
      removeEventListener: t.vi.fn(),
      postMessage: t.vi.fn(),
    });

    t.vi.stubGlobal('location', { origin: 'https://dapp.example' });

    transport = new DefaultTransport();

    // Trigger #setupMessageListener by calling sendEip1193Message
    // (we don't await it because the response won't come)
    transport
      .sendEip1193Message({ method: 'eth_chainId', params: [] })
      .catch(() => {
        // timeout expected
      });
  });

  t.afterEach(() => {
    t.vi.restoreAllMocks();
  });

  function fireNotification(data: unknown): void {
    const event = {
      data: {
        data: {
          name: 'metamask-provider',
          data,
        },
      },
      origin: 'https://dapp.example',
    } as unknown as MessageEvent;

    messageHandlers.forEach((handler) => handler(event));
  }

  t.describe('notification forwarding', () => {
    t.it('forwards metamask_chainChanged notifications to callbacks', () => {
      const callback = t.vi.fn();
      transport.onNotification(callback);

      const payload = {
        method: 'metamask_chainChanged',
        params: { chainId: '0x89' },
      };
      fireNotification(payload);

      t.expect(callback).toHaveBeenCalledWith(payload);
    });

    t.it('forwards metamask_accountsChanged notifications to callbacks', () => {
      const callback = t.vi.fn();
      transport.onNotification(callback);

      const payload = {
        method: 'metamask_accountsChanged',
        params: ['0xabc123'],
      };
      fireNotification(payload);

      t.expect(callback).toHaveBeenCalledWith(payload);
    });

    t.it(
      'forwards arbitrary notification methods (e.g. wallet_notify) to callbacks',
      () => {
        const callback = t.vi.fn();
        transport.onNotification(callback);

        const payload = {
          method: 'wallet_notify',
          params: {
            subscription: '0x1',
            result: { type: 'eth_subscription' },
          },
        };
        fireNotification(payload);

        t.expect(callback).toHaveBeenCalledWith(payload);
      },
    );

    t.it('does not forward messages without a method property', () => {
      const callback = t.vi.fn();
      transport.onNotification(callback);

      fireNotification({ id: '1', result: { accounts: [] } });

      t.expect(callback).not.toHaveBeenCalled();
    });

    t.it('does not forward null notification data', () => {
      const callback = t.vi.fn();
      transport.onNotification(callback);

      fireNotification(null);

      t.expect(callback).not.toHaveBeenCalled();
    });
  });
});
