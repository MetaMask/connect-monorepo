/* eslint-disable */
import type { Scope } from '@metamask/connect';
import { FEATURED_NETWORKS, TEST_IDS } from '@metamask/playground-ui';
import React from 'react';

type FeaturedNetworksProps = {
  selectedScopes: Record<string, boolean>;
  setSelectedScopes: React.Dispatch<
    React.SetStateAction<Record<string, boolean>>
  >;
  isExternallyConnectableConnected: boolean;
};

export const FeaturedNetworks: React.FC<FeaturedNetworksProps> = ({
  selectedScopes,
  setSelectedScopes,
  isExternallyConnectableConnected,
}) => {
  const featuredNetworks = Object.entries(FEATURED_NETWORKS);
  return (
    <div data-testid={TEST_IDS.featuredNetworks.container} className="space-y-2">
      {featuredNetworks.map(([networkName, chainId]) => (
        <label
          key={chainId}
          data-testid={TEST_IDS.featuredNetworks.networkItem(chainId)}
          className="flex items-center gap-2 cursor-pointer"
        >
          <input
            type="checkbox"
            name={chainId}
            checked={selectedScopes[chainId as Scope] ?? false}
            onChange={(evt) =>
              setSelectedScopes((prev) => ({
                ...prev,
                [chainId]: evt.target.checked,
              }))
            }
            disabled={!isExternallyConnectableConnected}
            data-testid={TEST_IDS.featuredNetworks.networkCheckbox(chainId)}
            id={TEST_IDS.featuredNetworks.networkCheckbox(chainId)}
            className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500 focus:ring-2 disabled:opacity-50"
          />
          <span data-testid={TEST_IDS.featuredNetworks.networkLabel(chainId)} className="text-gray-700">{networkName}</span>
        </label>
      ))}
    </div>
  );
};
