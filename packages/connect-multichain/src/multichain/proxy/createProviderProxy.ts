import { MultichainSDK } from "..";
import { providerErrors } from "@metamask/rpc-errors";
import { getAllScopesFromCaip25CaveatValue, getCaipAccountIdsFromCaip25CaveatValue, getPermittedAccountsForScopes, getSessionScopes } from "@metamask/chain-agnostic-permission"
import { Scope } from "src/domain";

export const createProviderProxy = (multichainSDK: MultichainSDK): any => ({
  createSession: async (params: any) => {
    const scopes = getAllScopesFromCaip25CaveatValue(params) as Scope[]
    const accounts = getCaipAccountIdsFromCaip25CaveatValue(params)

    await multichainSDK.connect(scopes, accounts, params.sessionProperties)
    return multichainSDK.transport.request({ method: 'wallet_getSession' }) as any;
  },
  getSession: async () => {
    if (!multichainSDK.transport) {
      return {
        "sessionScopes": {}
      }
    }

    return multichainSDK.transport.request({ method: 'wallet_getSession' }) as any;
  },
  revokeSession: async (_params: any) => {
    if (!multichainSDK.transport) {
      return true;
    }

    return multichainSDK.disconnect() .then(() => true).catch(() => false) // ???
  },
  invokeMethod: async (params: any) => {
    if (!multichainSDK.transport) {
      return Promise.reject(providerErrors.unauthorized())
    }
    return multichainSDK.invokeMethod(params)
  },
  extendsRpcApi: () => {
    return this
  },
  onNotification: (callback: (data: unknown) => void) => {
    console.log('onNotification dropped', callback);
  },
})
