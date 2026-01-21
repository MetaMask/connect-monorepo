import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import { formatEther, type Hex, parseEther } from 'viem';
import {
  type BaseError,
  useAccount,
  useBalance,
  useBlockNumber,
  useChainId,
  useConnectorClient,
  useSendTransaction,
  useSignMessage,
  useSwitchChain,
  useWaitForTransactionReceipt,
} from 'wagmi';
import { TEST_IDS } from '@metamask/playground-ui';
import { colors, sharedStyles } from '../styles/shared';

export function WagmiCard() {
  const account = useAccount();
  const chainId = useChainId();
  const { chains, switchChain } = useSwitchChain();
  const { data: balance } = useBalance({ address: account.address });
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const { data: connectorClient } = useConnectorClient();
  const { signMessage, data: signData } = useSignMessage();
  const {
    data: hash,
    error: sendError,
    isPending: isSending,
    sendTransaction,
  } = useSendTransaction();
  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const [message, setMessage] = useState('');
  const [sendToAddress, setSendToAddress] = useState('');
  const [sendValue, setSendValue] = useState('');

  const handleSignMessage = () => {
    if (message) {
      signMessage({ message });
    }
  };

  const handleSendTransaction = () => {
    if (sendToAddress && sendValue) {
      sendTransaction({
        to: sendToAddress as Hex,
        value: parseEther(sendValue),
      });
    }
  };

  return (
    <View testID={TEST_IDS.wagmi.card} style={styles.card}>
      <View style={styles.header}>
        <Text testID={TEST_IDS.wagmi.title} style={styles.title}>Wagmi Connection</Text>
      </View>

      <View style={styles.section}>
        <View style={sharedStyles.row}>
          <Text testID={TEST_IDS.wagmi.chainIdLabel} style={styles.sectionLabel}>Connected Chain:</Text>
          <View style={[sharedStyles.badge, sharedStyles.badgeBlue, { marginLeft: 8 }]}>
            <Text testID={TEST_IDS.wagmi.chainIdValue} style={[sharedStyles.badgeText, sharedStyles.badgeTextBlue]}>
              {chainId || 'Not available'}
            </Text>
          </View>
        </View>

        <View style={[sharedStyles.row, { marginTop: 8 }]}>
          <Text testID={TEST_IDS.wagmi.accountLabel} style={styles.sectionLabel}>Account:</Text>
          <View style={[sharedStyles.badge, sharedStyles.badgeBlue, { marginLeft: 8 }]}>
            <Text testID={TEST_IDS.wagmi.accountValue} style={[sharedStyles.badgeText, sharedStyles.badgeTextBlue]}>
              {account.address ? 'Connected' : 'Not connected'}
            </Text>
          </View>
        </View>

        {account.address && (
          <View testID={TEST_IDS.wagmi.activeAccount} style={[sharedStyles.badge, sharedStyles.badgeGreen, { marginTop: 12, alignSelf: 'stretch' }]}>
            <Text style={[sharedStyles.badgeText, sharedStyles.badgeTextGreen]}>Active Account:</Text>
            <Text style={[sharedStyles.textMono, sharedStyles.badgeTextGreen, { marginTop: 4 }]}>
              {account.address}
            </Text>
          </View>
        )}

        {balance && (
          <View testID={TEST_IDS.wagmi.balanceContainer} style={[sharedStyles.badge, sharedStyles.badgePurple, { marginTop: 12, alignSelf: 'stretch' }]}>
            <Text style={[sharedStyles.badgeText, sharedStyles.badgeTextPurple]}>Balance:</Text>
            <Text testID={TEST_IDS.wagmi.balanceValue} style={[sharedStyles.textMono, sharedStyles.badgeTextPurple, { marginTop: 4 }]}>
              {formatEther(balance.value)} {balance.symbol}
            </Text>
          </View>
        )}

        {blockNumber && (
          <View testID={TEST_IDS.wagmi.blockNumberContainer} style={[sharedStyles.badge, { backgroundColor: colors.gray50, marginTop: 12, alignSelf: 'stretch' }]}>
            <Text style={[sharedStyles.badgeText, { color: colors.gray800 }]}>Block Number:</Text>
            <Text testID={TEST_IDS.wagmi.blockNumberValue} style={[sharedStyles.textMono, { color: colors.gray700, marginTop: 4 }]}>
              {blockNumber.toString()}
            </Text>
          </View>
        )}
      </View>

      <ScrollView style={styles.buttonsContainer} showsVerticalScrollIndicator={false}>
        <View testID={TEST_IDS.wagmi.switchChainSection} style={styles.sectionDivider}>
          <Text style={styles.sectionTitle}>Switch Chain</Text>
          {chains.map((chain) => (
            <TouchableOpacity
              key={chain.id}
              testID={TEST_IDS.wagmi.btnSwitchChain(chain.id)}
              disabled={chainId === chain.id}
              onPress={() => switchChain({ chainId: chain.id })}
              style={[
                sharedStyles.button,
                chainId === chain.id && sharedStyles.buttonDisabled,
              ]}
            >
              <Text style={[
                sharedStyles.buttonText,
                chainId === chain.id && sharedStyles.buttonTextDisabled,
              ]}>
                {chain.name} {chainId === chain.id && '(Current)'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View testID={TEST_IDS.wagmi.signMessageSection} style={styles.sectionDivider}>
          <Text style={styles.sectionTitle}>Sign Message</Text>
          <TextInput
            testID={TEST_IDS.wagmi.inputMessage}
            style={sharedStyles.input}
            value={message}
            onChangeText={setMessage}
            placeholder="Enter message to sign"
            placeholderTextColor={colors.gray400}
          />
          <TouchableOpacity
            testID={TEST_IDS.wagmi.btnSignMessage}
            onPress={handleSignMessage}
            disabled={!message}
            style={[
              sharedStyles.button,
              { marginTop: 8 },
              !message && sharedStyles.buttonDisabled,
            ]}
          >
            <Text style={[
              sharedStyles.buttonText,
              !message && sharedStyles.buttonTextDisabled,
            ]}>
              Sign Message
            </Text>
          </TouchableOpacity>
          {signData && (
            <View testID={TEST_IDS.wagmi.signatureResult} style={[sharedStyles.badge, sharedStyles.badgeGreen, { marginTop: 8, alignSelf: 'stretch' }]}>
              <Text style={[sharedStyles.textMono, sharedStyles.badgeTextGreen]}>
                Signature: {signData}
              </Text>
            </View>
          )}
        </View>

        <View testID={TEST_IDS.wagmi.sendTxSection} style={styles.sectionDivider}>
          <Text style={styles.sectionTitle}>Send Transaction</Text>
          <TextInput
            testID={TEST_IDS.wagmi.inputToAddress}
            style={sharedStyles.input}
            value={sendToAddress}
            onChangeText={setSendToAddress}
            placeholder="To address (0x...)"
            placeholderTextColor={colors.gray400}
          />
          <TextInput
            testID={TEST_IDS.wagmi.inputAmount}
            style={[sharedStyles.input, { marginTop: 8 }]}
            value={sendValue}
            onChangeText={setSendValue}
            placeholder="Amount (ETH)"
            placeholderTextColor={colors.gray400}
            keyboardType="numeric"
          />
          <TouchableOpacity
            testID={TEST_IDS.wagmi.btnSendTransaction}
            onPress={handleSendTransaction}
            disabled={isSending || !sendToAddress || !sendValue}
            style={[
              sharedStyles.button,
              { marginTop: 8 },
              (isSending || !sendToAddress || !sendValue) && sharedStyles.buttonDisabled,
            ]}
          >
            <Text style={[
              sharedStyles.buttonText,
              (isSending || !sendToAddress || !sendValue) && sharedStyles.buttonTextDisabled,
            ]}>
              {isSending ? 'Sending...' : 'Send Transaction'}
            </Text>
          </TouchableOpacity>
          {hash && (
            <View testID={TEST_IDS.wagmi.txHashResult} style={[sharedStyles.badge, sharedStyles.badgeBlue, { marginTop: 8, alignSelf: 'stretch' }]}>
              <Text style={[sharedStyles.textMono, sharedStyles.badgeTextBlue]}>
                Transaction Hash: {hash}
              </Text>
            </View>
          )}
          {isConfirming && (
            <Text testID={TEST_IDS.wagmi.txConfirmingText} style={[sharedStyles.textSmall, { marginTop: 8, color: colors.blue600 }]}>
              Waiting for confirmation...
            </Text>
          )}
          {isConfirmed && (
            <Text testID={TEST_IDS.wagmi.txConfirmedText} style={[sharedStyles.textSmall, { marginTop: 8, color: colors.green600 }]}>
              Transaction confirmed!
            </Text>
          )}
          {sendError && (
            <View testID={TEST_IDS.wagmi.txErrorText} style={[sharedStyles.badge, sharedStyles.badgeRed, { marginTop: 8, alignSelf: 'stretch' }]}>
              <Text style={[sharedStyles.textMono, sharedStyles.badgeTextRed]}>
                Error: {(sendError as BaseError).shortMessage || sendError.message}
              </Text>
            </View>
          )}
        </View>

        {connectorClient && (
          <View testID={TEST_IDS.wagmi.connectorSection} style={styles.sectionDivider}>
            <Text style={styles.sectionTitle}>Connector Client Info</Text>
            <View style={[sharedStyles.badge, { backgroundColor: colors.gray50, alignSelf: 'stretch' }]}>
              <Text testID={TEST_IDS.wagmi.connectorAccount} style={[sharedStyles.textMono, { color: colors.gray800 }]}>
                Account: {connectorClient.account?.address}
              </Text>
              <Text testID={TEST_IDS.wagmi.connectorChainId} style={[sharedStyles.textMono, { color: colors.gray800, marginTop: 4 }]}>
                Chain ID: {connectorClient.chain?.id}
              </Text>
            </View>
          </View>
        )}
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
  sectionDivider: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: colors.gray200,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.gray700,
    marginBottom: 8,
  },
  buttonsContainer: {
    maxHeight: 400,
  },
});
