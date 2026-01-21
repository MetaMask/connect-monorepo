import { describe, it, expect } from 'vitest';

import { openRPCExampleToJSON, truncateJSON } from './json';

describe('openRPCExampleToJSON', () => {
  it('should return method name with empty params for method without examples', () => {
    const method = {
      name: 'test_method',
      params: [],
    };

    const result = openRPCExampleToJSON(method);

    expect(result).toEqual({
      method: 'test_method',
      params: [],
    });
  });

  it('should return method name with empty params for method with empty examples array', () => {
    const method = {
      name: 'test_method',
      params: [],
      examples: [],
    };

    const result = openRPCExampleToJSON(method);

    expect(result).toEqual({
      method: 'test_method',
      params: [],
    });
  });

  it('should extract params from first example', () => {
    const method = {
      name: 'eth_getBalance',
      params: [{ name: 'address' }, { name: 'block' }],
      examples: [
        {
          name: 'example1',
          params: [{ value: '0x1234' }, { value: 'latest' }],
          result: { value: '0x0' },
        },
      ],
    };

    const result = openRPCExampleToJSON(method);

    expect(result).toEqual({
      method: 'eth_getBalance',
      params: ['0x1234', 'latest'],
    });
  });

  it('should use by-name param structure when specified', () => {
    const method = {
      name: 'test_method',
      paramStructure: 'by-name' as const,
      params: [{ name: 'address' }, { name: 'block' }],
      examples: [
        {
          name: 'example1',
          params: [{ value: '0x1234' }, { value: 'latest' }],
          result: { value: '0x0' },
        },
      ],
    };

    const result = openRPCExampleToJSON(method);

    expect(result).toEqual({
      method: 'test_method',
      params: {
        address: '0x1234',
        block: 'latest',
      },
    });
  });
});

describe('truncateJSON', () => {
  it('should not truncate short JSON', () => {
    const result = truncateJSON({ a: 1 }, 100);

    expect(result).toEqual({
      text: '{"a":1}',
      truncated: false,
    });
  });

  it('should truncate long JSON', () => {
    const longObject = { data: 'a'.repeat(200) };
    const result = truncateJSON(longObject, 50);

    expect(result.text.length).toBe(50);
    expect(result.truncated).toBe(true);
  });

  it('should use default max length of 100', () => {
    const longObject = { data: 'a'.repeat(200) };
    const result = truncateJSON(longObject);

    expect(result.text.length).toBe(100);
    expect(result.truncated).toBe(true);
  });

  it('should not truncate JSON exactly at max length', () => {
    const json = { x: 'a' };
    const stringified = JSON.stringify(json);
    const result = truncateJSON(json, stringified.length);

    expect(result.text).toBe(stringified);
    expect(result.truncated).toBe(false);
  });
});
