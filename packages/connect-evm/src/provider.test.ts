/* eslint-disable jsdoc/require-jsdoc */
/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
import { RPCInvokeMethodErr } from '@metamask/connect-multichain';
import { describe, it, expect, vi } from 'vitest';

import { EIP1193Provider } from './provider';

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function createMockCore(
  supportedNetworks: Record<string, string> = {
    'eip155:1': 'https://rpc.example.com',
  },
) {
  return {
    invokeMethod: vi.fn(),
    options: {
      api: { supportedNetworks },
    },
  };
}

describe('EIP1193Provider', () => {
  describe('#request', () => {
    it('re-throws RPCInvokeMethodErr as an EIP-1193 error with the correct code', async () => {
      const mockCore = createMockCore();
      const provider = new EIP1193Provider(mockCore as any, vi.fn());
      provider.selectedChainId = '0x1';

      mockCore.invokeMethod.mockRejectedValue(
        new RPCInvokeMethodErr(
          'RPC Request failed with code 4001: User denied transaction signature.',
          4001,
          'User denied transaction signature.',
        ),
      );

      await expect(
        provider.request({ method: 'eth_sendTransaction', params: [] }),
      ).rejects.toMatchObject({
        message: 'User denied transaction signature.',
        code: 4001,
      });
    });

    it('preserves the rpcCode for internal errors (-32603)', async () => {
      const mockCore = createMockCore();
      const provider = new EIP1193Provider(mockCore as any, vi.fn());
      provider.selectedChainId = '0x1';

      mockCore.invokeMethod.mockRejectedValue(
        new RPCInvokeMethodErr(
          'RPC Request failed with code -32603: Internal error.',
          -32603,
          'Internal error.',
        ),
      );

      await expect(
        provider.request({ method: 'eth_getBalance', params: [] }),
      ).rejects.toMatchObject({
        message: 'Internal error.',
        code: -32603,
      });
    });

    it('propagates non-RPCInvokeMethodErr errors unchanged', async () => {
      const mockCore = createMockCore();
      const provider = new EIP1193Provider(mockCore as any, vi.fn());
      provider.selectedChainId = '0x1';

      const originalError = new Error('Something unexpected');
      mockCore.invokeMethod.mockRejectedValue(originalError);

      await expect(
        provider.request({ method: 'eth_blockNumber', params: [] }),
      ).rejects.toThrow('Something unexpected');
    });

    it('propagates RPCInvokeMethodErr without rpcCode unchanged', async () => {
      const mockCore = createMockCore();
      const provider = new EIP1193Provider(mockCore as any, vi.fn());
      provider.selectedChainId = '0x1';

      const rpcError = new RPCInvokeMethodErr('some internal error');
      mockCore.invokeMethod.mockRejectedValue(rpcError);

      await expect(
        provider.request({ method: 'eth_blockNumber', params: [] }),
      ).rejects.toBeInstanceOf(RPCInvokeMethodErr);
    });
  });
});
