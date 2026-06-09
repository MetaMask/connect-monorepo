/* eslint-disable @typescript-eslint/parameter-properties */
import type { Json } from '@metamask/utils';

import { BaseErr } from './base';
import type { RPCErrorCodes } from './types';

export class RPCHttpErr extends BaseErr<'RPC', RPCErrorCodes> {
  static readonly code = 50;

  constructor(
    readonly rpcEndpoint: string,
    readonly method: string,
    readonly httpStatus: number,
  ) {
    super(
      `RPCErr${RPCHttpErr.code}: ${httpStatus} on ${rpcEndpoint} for method ${method}`,
      RPCHttpErr.code,
    );
  }
}

export class RPCReadonlyResponseErr extends BaseErr<'RPC', RPCErrorCodes> {
  static readonly code = 51;

  constructor(public readonly reason: string) {
    super(
      `RPCErr${RPCReadonlyResponseErr.code}: RPC Client response reason ${reason}`,
      RPCReadonlyResponseErr.code,
    );
  }
}

export class RPCReadonlyRequestErr extends BaseErr<'RPC', RPCErrorCodes> {
  static readonly code = 52;

  constructor(public readonly reason: string) {
    super(
      `RPCErr${RPCReadonlyRequestErr.code}: RPC Client fetch reason ${reason}`,
      RPCReadonlyRequestErr.code,
    );
  }
}

export class RPCInvokeMethodErr extends BaseErr<'RPC', RPCErrorCodes> {
  static readonly code = 53;

  /**
   * @param reason - MetaMask Connect invokeMethod reason.
   * @param rpcCode - Original wallet JSON-RPC / EIP-1193 error code.
   * @param rpcMessage - Original provider-facing wallet message, sourced only
   * from the wallet's coded error. Unset when the wallet provides no message,
   * so it may differ from `reason`, which can fall back through the cause chain.
   * @param rpcData - Original JSON-RPC error data, when provided by the wallet.
   */
  constructor(
    public readonly reason: string,
    public readonly rpcCode?: number,
    public readonly rpcMessage?: string,
    public readonly rpcData?: Json,
  ) {
    super(
      `RPCErr${RPCInvokeMethodErr.code}: RPC Client invoke method reason (${reason})`,
      RPCInvokeMethodErr.code,
    );
  }
}
