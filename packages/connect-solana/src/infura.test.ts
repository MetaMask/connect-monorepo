/* eslint-disable @typescript-eslint/no-shadow -- Vitest globals */
import { getInfuraRpcUrls as getInfuraRpcUrlsMultichain } from '@metamask/connect-multichain';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { getInfuraRpcUrls } from './infura';

describe('getInfuraRpcUrls', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns only requested Solana networks for createSolanaClient', () => {
    (getInfuraRpcUrlsMultichain as ReturnType<typeof vi.fn>).mockReturnValue({
      'solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp':
        'https://solana-mainnet.infura.io/v3/test-key',
      'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1':
        'https://solana-devnet.infura.io/v3/test-key',
    });

    const result = getInfuraRpcUrls({
      infuraApiKey: 'test-key',
      networks: ['mainnet'],
    });

    expect(getInfuraRpcUrlsMultichain).toHaveBeenCalledWith({
      infuraApiKey: 'test-key',
      caipChainIds: ['solana:5eykt4UsFv8P8NJdTREpY1vzqKqZKvdp'],
    });
    expect(result).toStrictEqual({
      mainnet: 'https://solana-mainnet.infura.io/v3/test-key',
    });
  });

  it('omits unsupported requested networks from the returned map', () => {
    (getInfuraRpcUrlsMultichain as ReturnType<typeof vi.fn>).mockReturnValue({
      'solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1':
        'https://solana-devnet.infura.io/v3/test-key',
      'eip155:1': 'https://eth.mainnet.infura.io/v3/test-key',
    });

    const result = getInfuraRpcUrls({
      infuraApiKey: 'test-key',
      networks: ['mainnet', 'devnet', 'testnet'],
    });

    expect(result).toStrictEqual({
      devnet: 'https://solana-devnet.infura.io/v3/test-key',
    });
  });
});
