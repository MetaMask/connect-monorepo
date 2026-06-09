/* eslint-disable jsdoc/require-jsdoc -- Internal helpers are self-descriptive */
import { isValidJson, type Json } from '@metamask/utils';

import { RPCInvokeMethodErr } from '../../domain';

const MAX_ERROR_CAUSE_DEPTH = 5;

type InvocationErrorDetails = {
  reason: string;
  rpcCode?: number;
  rpcMessage?: string;
  rpcData?: Json;
};

type CodedErrorDetails = {
  code: number;
  message?: string;
  data?: Json;
};

function getErrorObject(value: unknown): Record<string, unknown> | undefined {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  return undefined;
}

function getNumericCode(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

function getNonEmptyMessage(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function getJsonData(value: unknown): Json | undefined {
  return value !== undefined && isValidJson(value) ? value : undefined;
}

function getFirstNonEmptyMessage(values: unknown[]): string | undefined {
  for (const value of values) {
    const message = getNonEmptyMessage(value);
    if (message !== undefined) {
      return message;
    }
  }
  return undefined;
}

function getErrorObjectChain(
  errorObject: Record<string, unknown> | undefined,
): Record<string, unknown>[] {
  const chain: Record<string, unknown>[] = [];
  let currentObject = errorObject;

  for (
    let depth = 0;
    currentObject !== undefined && depth < MAX_ERROR_CAUSE_DEPTH;
    depth += 1
  ) {
    chain.push(currentObject);
    currentObject = getErrorObject(currentObject.cause);
  }

  return chain;
}

function getCodedErrorDetails(
  value: Record<string, unknown> | undefined,
): CodedErrorDetails | undefined {
  const code = getNumericCode(value?.code);
  if (code === undefined) {
    return undefined;
  }

  const message = getNonEmptyMessage(value?.message);
  const data = getJsonData(value?.data);
  return {
    code,
    ...(message === undefined ? {} : { message }),
    ...(data === undefined ? {} : { data }),
  };
}

/**
 * Extracts the public invocation error fields from either a JSON-RPC error
 * payload or a rejected Error-like value.
 *
 * @param error - Unknown error thrown or returned during method execution.
 * @returns Canonical fields for RPCInvokeMethodErr.
 */
function getInvocationErrorDetails(error: unknown): InvocationErrorDetails {
  const errorObject = getErrorObject(error);
  const errorObjectChain = getErrorObjectChain(errorObject);
  const primitiveMessage = getNonEmptyMessage(error);
  for (const [index, currentObject] of errorObjectChain.entries()) {
    const codedDetails = getCodedErrorDetails(currentObject);
    if (codedDetails) {
      // The rpc* fields mirror the wallet's own JSON-RPC error, so they are
      // sourced strictly from the coded node. The human-readable `reason` may
      // still fall back through the cause chain (deeper cause first, then outer
      // wrappers) so logs stay descriptive when the wallet omits a message.
      const descendantObjects = errorObjectChain.slice(index + 1);
      const ancestorObjects = errorObjectChain.slice(0, index);
      const descendantMessage = getFirstNonEmptyMessage(
        descendantObjects.map((object) => object.message),
      );
      const ancestorMessage = getFirstNonEmptyMessage([
        primitiveMessage,
        ...ancestorObjects.map((object) => object.message),
      ]);
      const reason =
        codedDetails.message ??
        descendantMessage ??
        ancestorMessage ??
        'Unknown error';
      return {
        reason,
        rpcCode: codedDetails.code,
        ...(codedDetails.message === undefined
          ? {}
          : { rpcMessage: codedDetails.message }),
        ...(codedDetails.data === undefined
          ? {}
          : { rpcData: codedDetails.data }),
      };
    }
  }

  const reason =
    primitiveMessage ??
    getFirstNonEmptyMessage(errorObjectChain.map((object) => object.message)) ??
    'Unknown error';

  return {
    reason,
  };
}

/**
 * Normalizes unknown invocation errors to the router error type.
 *
 * @param error - Unknown error thrown or returned during method execution.
 * @returns Error instance surfaced by invokeMethod.
 */
export function toRPCInvokeMethodErr(error: unknown): RPCInvokeMethodErr {
  if (error instanceof RPCInvokeMethodErr) {
    return error;
  }

  const { reason, rpcCode, rpcMessage, rpcData } =
    getInvocationErrorDetails(error);
  return new RPCInvokeMethodErr(reason, rpcCode, rpcMessage, rpcData);
}
