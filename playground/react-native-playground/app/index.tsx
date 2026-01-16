
import { useState, useEffect, useCallback } from 'react';
import { SafeAreaView, ScrollView, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Scope, SessionData } from '@metamask/connect-multichain';
import { hexToNumber, type CaipAccountId } from '@metamask/utils';
import { Buffer } from 'buffer';

import { useSDK } from '../src/sdk';
import { useLegacyEVMSDK } from '../src/sdk';
import DynamicInputs, { INPUT_LABEL_TYPE } from '../src/components/DynamicInputs';
import { FEATURED_NETWORKS } from '../src/constants/networks';
import { ScopeCard } from '../src/components/ScopeCard';
import { LegacyEVMCard } from '../src/components/LegacyEVMCard';
import { convertCaipChainIdsToHex } from '../src/helpers/ChainIdHelpers';
import { colors, sharedStyles } from '../src/styles/shared';

// Configure Buffer polyfill for React Native
global.Buffer = Buffer;

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
		const sessionScopes = Object.keys(session?.sessionScopes ?? {});
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
		// Then convert hex chain IDs to numbers for the connect method
		const chainIds = convertCaipChainIdsToHex(selectedScopesArray).map(id => hexToNumber(id));
		await legacyConnect(chainIds);
	}, [customScopes, legacyConnect]);

	const isConnected = state === 'connected';
	const isDisconnected = state === 'disconnected' || state === 'pending' || state === 'loaded';

	const disconnect = useCallback(async () => {
		// Disconnect both multichain and legacy EVM if connected
		if (isConnected) {
			await sdkDisconnect();
		}
		if (legacyConnected) {
			await legacyDisconnect();
		}
	}, [sdkDisconnect, legacyDisconnect, isConnected, legacyConnected]);

	const availableOptions = Object.keys(FEATURED_NETWORKS).reduce<{ name: string; value: string }[]>((all, networkName) => {
		const networkCaipValue = FEATURED_NETWORKS[networkName as keyof typeof FEATURED_NETWORKS];
		all.push({ name: networkName, value: networkCaipValue });
		return all;
	}, []);

	const isConnecting = state === 'connecting';

	return (
		<SafeAreaView style={sharedStyles.safeArea}>
			<StatusBar style="auto" />
			<ScrollView style={sharedStyles.container} contentContainerStyle={sharedStyles.scrollContainer}>
				<Text style={sharedStyles.heading1}>MetaMask MultiChain API Test Dapp</Text>

				<View style={sharedStyles.card}>
					<View style={styles.scopeSelection}>
						<DynamicInputs availableOptions={availableOptions} inputArray={customScopes} handleCheckboxChange={handleCheckboxChange} label={INPUT_LABEL_TYPE.SCOPE} />
					</View>

					{isConnecting && (
						<>
							<TouchableOpacity onPress={connect} style={sharedStyles.button} disabled>
								<Text style={sharedStyles.buttonText}>Connecting...</Text>
							</TouchableOpacity>
							<TouchableOpacity onPress={disconnect} style={sharedStyles.buttonCancel}>
								<Text style={sharedStyles.buttonText}>Cancel</Text>
							</TouchableOpacity>
						</>
					)}

					{isDisconnected && (
						<TouchableOpacity onPress={connect} style={sharedStyles.button}>
							<Text style={sharedStyles.buttonText}>Connect</Text>
						</TouchableOpacity>
					)}

					{!legacyConnected && (
						<TouchableOpacity onPress={connectLegacyEVM} style={[sharedStyles.button, styles.legacyButton]}>
							<Text style={sharedStyles.buttonText}>Connect (Legacy EVM)</Text>
						</TouchableOpacity>
					)}

					{isConnected && (
						<TouchableOpacity onPress={scopesHaveChanged() ? connect : disconnect} style={sharedStyles.button}>
							<Text style={sharedStyles.buttonText}>{scopesHaveChanged() ? 'Re Establishing Connection' : 'Disconnect'}</Text>
						</TouchableOpacity>
					)}

					{(isConnected || legacyConnected) && (
						<TouchableOpacity onPress={disconnect} style={sharedStyles.buttonCancel}>
							<Text style={sharedStyles.buttonText}>Disconnect</Text>
						</TouchableOpacity>
					)}
				</View>

				{error && (
					<View style={[sharedStyles.card, styles.errorCard]}>
						<Text style={styles.errorTitle}>Error</Text>
						<Text style={sharedStyles.text}>{error.message.toString()}</Text>
					</View>
				)}

				{Object.keys(session?.sessionScopes ?? {}).length > 0 && (
					<View style={sharedStyles.card}>
						<Text style={sharedStyles.heading2}>Connected Networks</Text>
						{Object.entries(session?.sessionScopes ?? {}).map(([scope, details]) => {
							return <ScopeCard key={scope} scope={scope as Scope} details={details as SessionData['sessionScopes'][Scope]} />;
						})}
					</View>
				)}

				{legacyConnected && legacyProvider && legacySDK && (
					<View style={sharedStyles.card}>
						<Text style={sharedStyles.heading2}>Legacy EVM Connection</Text>
						<LegacyEVMCard
							provider={legacyProvider}
							chainId={legacyChainId}
							accounts={legacyAccounts}
							sdk={legacySDK}
						/>
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
});
