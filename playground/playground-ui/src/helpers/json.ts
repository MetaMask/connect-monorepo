import type { Json } from '@metamask/utils';
import type {
  ContentDescriptorObject,
  ExampleObject,
  ExamplePairingObject,
  MethodObject,
} from '@open-rpc/meta-schema';

/**
 * Converts an array of params to an object using method param names as keys.
 *
 * @param params - Array of parameter values
 * @param methodParams - Array of parameter descriptors with names
 * @returns Object with param names as keys
 */
const paramsToObj = (
  params: Json[],
  methodParams: ContentDescriptorObject[],
): Record<string, Json> => {
  return params.reduce<Record<string, Json>>((acc, val, i) => {
    const paramName = methodParams[i]?.name;
    if (paramName) {
      acc[paramName] = val;
    }
    return acc;
  }, {});
};

/**
 * Converts an OpenRPC method definition to a JSON-RPC request object.
 * Uses the first example from the method definition if available.
 *
 * @param method - The OpenRPC method object
 * @returns A JSON-RPC request object with method name and params
 *
 * @example
 * ```typescript
 * const methodDef = { name: 'eth_getBalance', examples: [...], ... };
 * openRPCExampleToJSON(methodDef)
 * // Returns: { method: 'eth_getBalance', params: ['0x...', 'latest'] }
 * ```
 */
export const openRPCExampleToJSON = (
  method: MethodObject,
): { method: string; params: Json[] | Record<string, Json> } => {
  if (!method.examples || method.examples.length === 0) {
    return {
      method: method.name,
      params: [],
    };
  }
  const examplePairing = method.examples[0];
  const ex = examplePairing as ExamplePairingObject;
  const paramsFromExample = ex.params.map(
    (example) => (example as ExampleObject).value as Json,
  );
  const params =
    method.paramStructure === 'by-name'
      ? paramsToObj(
          paramsFromExample,
          method.params as ContentDescriptorObject[],
        )
      : paramsFromExample;
  return {
    method: method.name,
    params,
  };
};

/**
 * Truncates a JSON value to a maximum string length.
 *
 * @param json - The JSON value to truncate
 * @param maxLength - Maximum length of the output string (default: 100)
 * @returns Object with truncated text and whether truncation occurred
 *
 * @example
 * ```typescript
 * truncateJSON({ large: 'object with lots of data' }, 20)
 * // Returns: { text: '{"large":"object wit', truncated: true }
 * ```
 */
export const truncateJSON = (
  json: unknown,
  maxLength = 100,
): { text: string; truncated: boolean } => {
  const originalStringified = JSON.stringify(json);
  if (originalStringified.length <= maxLength) {
    return { text: originalStringified, truncated: false };
  }
  return {
    text: originalStringified.slice(0, maxLength),
    truncated: true,
  };
};
