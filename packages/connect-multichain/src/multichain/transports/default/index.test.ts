/* eslint-disable id-length -- vitest alias */
import * as t from 'vitest';

const mocks = t.vi.hoisted(() => ({
  innerTransport: {
    connect: t.vi.fn(),
    disconnect: t.vi.fn(),
    isConnected: t.vi.fn(),
    onNotification: t.vi.fn(),
    request: t.vi.fn(),
  },
}));

t.vi.mock('@metamask/multichain-api-client', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@metamask/multichain-api-client')>();

  return {
    ...actual,
    getDefaultTransport: t.vi.fn(() => mocks.innerTransport),
  };
});

const { DefaultTransport } = await import('.');

t.describe('DefaultTransport', () => {
  t.afterEach(() => {
    t.vi.clearAllMocks();
  });

  t.describe('request', () => {
    t.it(
      'rejects when the inner transport resolves a wallet error response',
      async () => {
        mocks.innerTransport.request.mockResolvedValue({
          id: '1',
          jsonrpc: '2.0',
          error: {
            code: 4001,
            message: 'User rejected the request',
          },
        });

        const transport = new DefaultTransport();

        await t
          .expect(
            transport.request({
              method: 'wallet_invokeMethod',
              params: {
                scope: 'eip155:1',
                request: { method: 'personal_sign', params: [] },
              },
            } as never),
          )
          .rejects.toMatchObject({
            code: 4001,
            message: 'User rejected the request',
          });
      },
    );
  });
});
