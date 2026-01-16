import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import type { EIP1193Provider } from '@metamask/connect-evm';
import { send_eth_signTypedData_v4, send_personal_sign } from '../helpers/SignHelpers';
import { colors, sharedStyles } from '../styles/shared';

interface LegacyEVMCardProps {
  provider: EIP1193Provider;
  chainId: string | undefined;
  accounts: string[];
  sdk: any;
}

export function LegacyEVMCard({
  provider,
  chainId,
  accounts,
  sdk,
}: LegacyEVMCardProps) {
  const [response, setResponse] = useState<string>('');

  const requestPermissions = async () => {
    if (!provider) {
      setResponse('Provider not available');
      return;
    }
    try {
      const response = await provider.request({
        method: 'wallet_requestPermissions',
        params: [],
      });
      setResponse(`Accounts: ${JSON.stringify(response)}`);
    } catch (e) {
      console.error('Error requesting accounts', e);
      setResponse(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const eth_getBalance = async () => {
    if (!provider || !accounts[0]) {
      setResponse('Provider or accounts not available');
      return;
    }
    try {
      const result = await provider.request({
        method: 'eth_getBalance',
        params: [accounts[0], 'latest'],
      });
      setResponse(`Balance: ${result}`);
    } catch (e) {
      console.error('Error getting balance', e);
      setResponse(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const eth_blockNumber = async () => {
    if (!provider) {
      setResponse('Provider not available');
      return;
    }
    try {
      const result = await provider.request({
        method: 'eth_blockNumber',
        params: [],
      });
      setResponse(`Block Number: ${result}`);
    } catch (e) {
      console.error('Error getting block number', e);
      setResponse(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const eth_gasPrice = async () => {
    if (!provider) {
      setResponse('Provider not available');
      return;
    }
    try {
      const result = await provider.request({
        method: 'eth_gasPrice',
        params: [],
      });
      setResponse(`Gas Price: ${result}`);
    } catch (e) {
      console.error('Error getting gas price', e);
      setResponse(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const addEthereumChain = async () => {
    if (!provider) {
      setResponse('Provider not available');
      return;
    }

    try {
      await provider.request({
        method: 'wallet_addEthereumChain',
        params: [
          {
            chainId: '0x89',
            chainName: 'Polygon',
            blockExplorerUrls: ['https://polygonscan.com'],
            nativeCurrency: { symbol: 'MATIC', decimals: 18 },
            rpcUrls: ['https://polygon-rpc.com/'],
          },
        ],
      });
      setResponse('Polygon chain added successfully');
    } catch (e) {
      console.error('Error adding chain', e);
      setResponse(`Error: ${e instanceof Error ? e.message : 'Unknown error'}`);
    }
  };

  const sendTransaction = async () => {
    if (!accounts[0]) {
      setResponse('No account available');
      return;
    }
    const to = '0x0000000000000000000000000000000000000000';
    const transactionParameters = {
      to, // Required except during contract publications.
      from: accounts[0], // must match user's active address.
      value: '0x5AF3107A4000', // Only required to send ether to the recipient from the initiating external account.
    };
    console.log('transactionParameters', transactionParameters);

    try {
      // txHash is a hex string
      // As with any RPC call, it may throw an error
      const txHash = (await provider?.request({
        method: 'eth_sendTransaction',
        params: [transactionParameters],
      })) as string;

      setResponse(txHash);
    } catch (e) {
      console.log(e);
      setResponse(e instanceof Error ? e.message : 'Unknown error');
    }
  };

  const eth_signTypedData_v4 = async () => {
    if (!provider) {
      setResponse(`invalid ethereum provider`);
      return;
    }
    const result = await send_eth_signTypedData_v4(
      provider,
      sdk?.selectedChainId ?? '',
    );
    setResponse(result as string);
  };

  const eth_personal_sign = async () => {
    if (!provider) {
      setResponse(`invalid ethereum provider`);
      return;
    }
    const result = await send_personal_sign(provider);
    setResponse(result as string);
  };

  const changeNetwork = async (hexChainId: string) => {
    console.debug(`switching to network chainId=${hexChainId}`);
    try {
      const response = await provider?.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: hexChainId }], // chainId must be in hexadecimal numbers
      });
      console.debug(`response`, response);
      setResponse(`Switched to chain ${hexChainId}`);
    } catch (err) {
      console.error(err);
      setResponse(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>Legacy EVM Connection</Text>
      </View>

      <View style={styles.section}>
        <View style={sharedStyles.row}>
          <Text style={styles.sectionLabel}>Connected Chain:</Text>
          <View style={[sharedStyles.badge, sharedStyles.badgeBlue, { marginLeft: 8 }]}>
            <Text style={[sharedStyles.badgeText, sharedStyles.badgeTextBlue]}>
              {chainId || 'Not available'}
            </Text>
          </View>
        </View>

        <View style={[sharedStyles.row, { marginTop: 8 }]}>
          <Text style={styles.sectionLabel}>Accounts:</Text>
          <View style={[sharedStyles.badge, sharedStyles.badgeBlue, { marginLeft: 8 }]}>
            <Text style={[sharedStyles.badgeText, sharedStyles.badgeTextBlue]}>
              {accounts.length} available
            </Text>
          </View>
        </View>

        {accounts.length > 0 && (
          <View style={[sharedStyles.badge, sharedStyles.badgeGreen, { marginTop: 12, alignSelf: 'stretch' }]}>
            <Text style={[sharedStyles.badgeText, sharedStyles.badgeTextGreen]}>Active Account:</Text>
            <Text style={[sharedStyles.textMono, sharedStyles.badgeTextGreen, { marginTop: 4 }]}>
              {accounts[0]}
            </Text>
          </View>
        )}
      </View>

      {response && (
        <View style={styles.responseContainer}>
          <Text style={styles.responseLabel}>Last Response:</Text>
          <Text style={[sharedStyles.textMono, styles.responseText]}>{String(response)}</Text>
        </View>
      )}

      <ScrollView style={styles.buttonsContainer} showsVerticalScrollIndicator={false}>
        <TouchableOpacity onPress={requestPermissions} style={sharedStyles.button}>
          <Text style={sharedStyles.buttonText}>wallet_requestPermissions</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={eth_signTypedData_v4} style={sharedStyles.button}>
          <Text style={sharedStyles.buttonText}>eth_signTypedData_v4</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={eth_personal_sign} style={sharedStyles.button}>
          <Text style={sharedStyles.buttonText}>personal_sign</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={sendTransaction} style={sharedStyles.button}>
          <Text style={sharedStyles.buttonText}>Send transaction</Text>
        </TouchableOpacity>

        {chainId === '0x1' ? (
          <TouchableOpacity onPress={() => changeNetwork('0xAA36A7')} style={sharedStyles.button}>
            <Text style={sharedStyles.buttonText}>Switch to Sepolia</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={() => changeNetwork('0x1')} style={sharedStyles.button}>
            <Text style={sharedStyles.buttonText}>Switch to Mainnet</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity onPress={() => changeNetwork('0x89')} style={sharedStyles.button}>
          <Text style={sharedStyles.buttonText}>Switch to Polygon</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={addEthereumChain} style={sharedStyles.button}>
          <Text style={sharedStyles.buttonText}>Add Polygon Chain</Text>
        </TouchableOpacity>

        <View style={styles.readOnlySection}>
          <Text style={styles.readOnlyTitle}>Read-Only RPC Calls</Text>
          <TouchableOpacity onPress={eth_getBalance} style={[sharedStyles.button, styles.readOnlyButton]}>
            <Text style={sharedStyles.buttonText}>eth_getBalance</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={eth_blockNumber} style={[sharedStyles.button, styles.readOnlyButton]}>
            <Text style={sharedStyles.buttonText}>eth_blockNumber</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={eth_gasPrice} style={[sharedStyles.button, styles.readOnlyButton]}>
            <Text style={sharedStyles.buttonText}>eth_gasPrice</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.gray800,
  },
  section: {
    marginBottom: 16,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray600,
  },
  responseContainer: {
    backgroundColor: colors.gray50,
    borderWidth: 1,
    borderColor: colors.gray200,
    borderRadius: 6,
    padding: 12,
    marginBottom: 16,
  },
  responseLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray600,
    marginBottom: 4,
  },
  responseText: {
    fontSize: 12,
    color: colors.gray700,
  },
  buttonsContainer: {
    maxHeight: 400,
  },
  readOnlySection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  readOnlyTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray700,
    marginBottom: 8,
  },
  readOnlyButton: {
    backgroundColor: colors.purple600,
    marginBottom: 8,
  },
});
