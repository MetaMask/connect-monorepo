import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Scope, SessionData } from '@metamask/connect-multichain';
import { hexToNumber, type CaipAccountId, type Hex } from '@metamask/utils';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { TEST_IDS } from '@metamask/playground-ui';

import { useSDK, useLegacyEVMSDK } from '../src/sdk';
import DynamicInputs, { INPUT_LABEL_TYPE } from '../src/components/DynamicInputs';
import { FEATURED_NETWORKS } from '../src/constants/networks';
import { ScopeCard } from '../src/components/ScopeCard';
import { LegacyEVMCard } from '../src/components/LegacyEVMCard';
import { WagmiCard } from '../src/components/WagmiCard';
import { convertCaipChainIdsToHex } from '../src/helpers/ChainIdHelpers';
import { colors, sharedStyles } from '../src/styles/shared';

export default function Page() {
	const [customScopes, setCustomScopes] = useState<Scope[]>(['eip155:1' as Scope]);
	const [caipAccountIds, setCaipAccountIds] = useState<CaipAccountId[]>([]);
	const { error, state, session, connect: sdkConnect, disconnect: sdkDisconnect } = useSDK();
	const {
		connected: legacyConnected,
		provider: legacyProvider,
		chainId: legacyChainId,
		accounts: legacyAccounts,
		sdk: legacySDK,
		connect: legacyConnect,
		disconnect: legacyDisconnect,
	} = useLegacyEVMSDK();
	const { address: wagmiAddress, isConnected: wagmiConnected } = useAccount();
	const { connectors, connectAsync: wagmiConnectAsync, status: wagmiStatus } = useConnect();
	const { disconnect: wagmiDisconnect } = useDisconnect();

	const handleCheckboxChange = useCallback(
		(value: string, isChecked: boolean) => {
			if (isChecked) {
				setCustomScopes(Array.from(new Set([...customScopes, value as Scope])));
			} else {
				setCustomScopes(customScopes.filter((item) => item !== value));
			}
		},
		[customScopes],
	);

	useEffect(() => {
		if (session) {
			const scopes = Object.keys(session?.sessionScopes ?? {}) as Scope[];
			setCustomScopes(scopes);

			// Accumulate all accounts from all scopes
			const allAccounts: CaipAccountId[] = [];
			for (const scope of scopes) {
				const { accounts } = session.sessionScopes?.[scope as keyof typeof session.sessionScopes] ?? {};
				if (accounts && accounts.length > 0) {
					allAccounts.push(...accounts);
				}
			}
			setCaipAccountIds(allAccounts);
		}
	}, [session]);

	const scopesHaveChanged = useCallback(() => {
		if (!session) return false;
		const sessionScopes = Object.keys(session?.sessionScopes ?? {}) as Scope[];
		const currentScopes = customScopes.filter((scope) => scope.length);
		if (sessionScopes.length !== currentScopes.length) return true;
		return !sessionScopes.every((scope) => currentScopes.includes(scope)) || !currentScopes.every((scope) => sessionScopes.includes(scope));
	}, [session, customScopes]);

	const connect = useCallback(async () => {
		const selectedScopesArray = customScopes.filter((scope) => scope.length);
		const filteredAccountIds = caipAccountIds.filter((addr) => addr.trim() !== '');
		return sdkConnect(selectedScopesArray, filteredAccountIds as CaipAccountId[]);
	}, [customScopes, caipAccountIds, sdkConnect]);

	const connectLegacyEVM = useCallback(async () => {
		const selectedScopesArray = customScopes.filter((scope) => scope.length);
		// Convert CAIP-2 chain IDs to hex, filtering out Solana and other non-EVM networks
		const chainIds = convertCaipChainIdsToHex(selectedScopesArray) as Hex[];
		await legacyConnect(chainIds);
	}, [customScopes, legacyConnect]);

	const connectWagmi = useCallback(async () => {
		const selectedScopesArray = customScopes.filter((scope) => scope.length);
		// Convert CAIP-2 chain IDs to hex, filtering out Solana and other non-EVM networks
		// Then convert hex chain IDs to numbers for the connect method
		const chainIds = convertCaipChainIdsToHex(selectedScopesArray).map(id => hexToNumber(id));
		// Use first chain or default to mainnet (1), ensuring it's a valid wagmi chain
		const chainId = (chainIds[0] || 1) as 1 | 10 | 11155111 | 42220;

		const metaMaskConnector = connectors.find((c) => c.id === 'metaMaskSDK');
		if (metaMaskConnector) {
			try {
				await wagmiConnectAsync({
					connector: metaMaskConnector,
					chainId,
				});
			} catch (error) {
				console.error('Wagmi connection error:', error);
			}
		}
	}, [customScopes, connectors, wagmiConnectAsync]);

	const isConnected = state === 'connected';
	const isDisconnected = state === 'disconnected' || state === 'pending' || state === 'loaded';

	const disconnect = useCallback(async () => {
		// Disconnect all connections if connected
		if (isConnected) {
			await sdkDisconnect();
		}
		if (legacyConnected) {
			await legacyDisconnect();
		}
		if (wagmiConnected) {
			wagmiDisconnect();
		}
	}, [sdkDisconnect, legacyDisconnect, wagmiDisconnect, isConnected, legacyConnected, wagmiConnected]);

	const availableOptions = Object.keys(FEATURED_NETWORKS).reduce<{ name: string; value: string }[]>((all, networkName) => {
		const networkCaipValue = FEATURED_NETWORKS[networkName as keyof typeof FEATURED_NETWORKS];
		all.push({ name: networkName, value: networkCaipValue });
		return all;
	}, []);

	const isConnecting = state === 'connecting';

	return (
		<SafeAreaView testID={TEST_IDS.app.container} style={sharedStyles.safeArea}>
			<StatusBar style="auto" />
			<ScrollView style={sharedStyles.container} contentContainerStyle={sharedStyles.scrollContainer}>
				<Text testID={TEST_IDS.app.title} style={sharedStyles.heading1}>MetaMask MultiChain API Test Dapp</Text>

				<View style={sharedStyles.card}>
					<View style={styles.scopeSelection}>
						<DynamicInputs availableOptions={availableOptions} inputArray={customScopes} handleCheckboxChange={handleCheckboxChange} label={INPUT_LABEL_TYPE.SCOPE} />
					</View>

					{isConnecting && (
						<>
							<TouchableOpacity testID={TEST_IDS.app.btnConnect()} onPress={connect} style={sharedStyles.button} disabled>
								<Text style={sharedStyles.buttonText}>Connecting...</Text>
							</TouchableOpacity>
							<TouchableOpacity testID={TEST_IDS.app.btnCancel} onPress={disconnect} style={sharedStyles.buttonCancel}>
								<Text style={sharedStyles.buttonText}>Cancel</Text>
							</TouchableOpacity>
						</>
					)}

					{isDisconnected && (
						<TouchableOpacity testID={TEST_IDS.app.btnConnect()} onPress={connect} style={sharedStyles.button}>
							<Text style={sharedStyles.buttonText}>Connect</Text>
						</TouchableOpacity>
					)}

					{!legacyConnected && (
						<TouchableOpacity testID={TEST_IDS.app.btnConnect('legacy')} onPress={connectLegacyEVM} style={[sharedStyles.button, styles.legacyButton]}>
							<Text style={sharedStyles.buttonText}>Connect (Legacy EVM)</Text>
						</TouchableOpacity>
					)}

					{!wagmiConnected && (
						<TouchableOpacity
							testID={TEST_IDS.app.btnConnect('wagmi')}
							onPress={connectWagmi}
							disabled={wagmiStatus === 'pending'}
							style={[
								sharedStyles.button,
								styles.wagmiButton,
								wagmiStatus === 'pending' && sharedStyles.buttonDisabled,
							]}
						>
							<Text style={[
								sharedStyles.buttonText,
								wagmiStatus === 'pending' && sharedStyles.buttonTextDisabled,
							]}>
								{wagmiStatus === 'pending' ? 'Connecting...' : 'Connect (Wagmi)'}
							</Text>
						</TouchableOpacity>
					)}

					{isConnected && (
						<TouchableOpacity testID={scopesHaveChanged() ? TEST_IDS.app.btnReconnect : TEST_IDS.app.btnDisconnect} onPress={scopesHaveChanged() ? connect : disconnect} style={sharedStyles.button}>
							<Text style={sharedStyles.buttonText}>{scopesHaveChanged() ? 'Re Establishing Connection' : 'Disconnect'}</Text>
						</TouchableOpacity>
					)}

					{(isConnected || legacyConnected || wagmiConnected) && (
						<TouchableOpacity testID={TEST_IDS.app.btnDisconnect} onPress={disconnect} style={sharedStyles.buttonCancel}>
							<Text style={sharedStyles.buttonText}>Disconnect</Text>
						</TouchableOpacity>
					)}
				</View>

				{error && (
					<View testID={TEST_IDS.app.sectionError} style={[sharedStyles.card, styles.errorCard]}>
						<Text style={styles.errorTitle}>Error</Text>
						<Text style={sharedStyles.text}>{error.message.toString()}</Text>
					</View>
				)}

				{Object.keys(session?.sessionScopes ?? {}).length > 0 && (
					<View testID={TEST_IDS.app.sectionScopes} style={sharedStyles.card}>
						<Text style={sharedStyles.heading2}>Connected Networks</Text>
						{Object.entries(session?.sessionScopes ?? {}).map(([scope, details]) => {
							return <ScopeCard key={scope} scope={scope as Scope} details={details as SessionData['sessionScopes'][Scope]} />;
						})}
					</View>
				)}

				{legacyConnected && legacyProvider && legacySDK && (
					<View testID={TEST_IDS.app.sectionConnected} style={sharedStyles.card}>
						<Text style={sharedStyles.heading2}>Legacy EVM Connection</Text>
						<LegacyEVMCard
							provider={legacyProvider}
							chainId={legacyChainId}
							accounts={legacyAccounts}
							sdk={legacySDK}
						/>
					</View>
				)}

				{wagmiConnected && wagmiAddress && (
					<View style={sharedStyles.card}>
						<Text style={sharedStyles.heading2}>Wagmi Connection</Text>
						<WagmiCard />
					</View>
				)}
			</ScrollView>
		</SafeAreaView>
	);
}

const styles = StyleSheet.create({
	scopeSelection: {
		marginBottom: 16,
	},
	errorCard: {
		backgroundColor: colors.red50,
		borderWidth: 1,
		borderColor: colors.red200,
	},
	errorTitle: {
		fontSize: 18,
		fontWeight: 'bold',
		color: colors.red600,
		marginBottom: 8,
	},
	legacyButton: {
		backgroundColor: colors.green600,
		marginTop: 8,
	},
	wagmiButton: {
		backgroundColor: colors.purple600,
		marginTop: 8,
	},
});
