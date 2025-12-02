/* eslint-disable @typescript-eslint/naming-convention */
/* eslint-disable no-restricted-syntax */
import createClient from 'openapi-fetch';

import type * as schema from './schema';
import Sender from './sender';

type Event = schema.components['schemas']['EventV2'];
type MMConnectPayload = schema.components['schemas']['MMConnectPayload'];
type MMConnectProperties = schema.components['schemas']['MMConnectProperties'];
type MMConnectEventName = MMConnectPayload['event_name'];

class Analytics {
  private enabled = false;

  private readonly sender: Sender<Event>;

  private properties: Partial<MMConnectProperties> = {};

  constructor(baseUrl: string) {
    const client = createClient<schema.paths>({ baseUrl });

    const sendFn = async (batch: Event[]): Promise<void> => {
      const res = await client.POST('/v2/events', { body: batch });
      if (res.response.status !== 200) {
        throw new Error(res.error);
      }
    };

    this.sender = new Sender({ batchSize: 100, baseTimeoutMs: 200, sendFn });
  }

  public enable(): void {
    this.enabled = true;
  }

  public setGlobalProperty<K extends keyof MMConnectProperties>(
    key: K,
    value: MMConnectProperties[K],
  ): void {
    this.properties[key] = value;
  }

  public track(
    eventName: MMConnectEventName,
    properties: Partial<MMConnectProperties>,
  ): void {
    if (!this.enabled) {
      return;
    }

    const event: MMConnectPayload = {
      namespace: 'metamask/connect',
      event_name: eventName,
      properties: { ...properties, ...this.properties } as MMConnectProperties,
    };

    this.sender.enqueue(event);
  }
}

export default Analytics;
