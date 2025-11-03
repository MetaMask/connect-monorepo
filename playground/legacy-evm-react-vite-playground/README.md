# Legacy EVM React Vite Playground

> A demo application showcasing `@metamask/connect-evm` integration in a React + Vite application.

This playground demonstrates how to use `@metamask/connect-evm` in a React application with Vite. It provides working examples of all major features including connection, signing, transactions, and chain switching.

## Features Demonstrated

- **Connection Management** - Connect to MetaMask and manage wallet sessions
- **Account & Chain Info** - Display connected account, chain ID, and balance
- **Message Signing** - Sign messages using `personal_sign` and `eth_signTypedData_v4`
- **Transactions** - Send Ethereum transactions
- **Chain Switching** - Switch between different Ethereum networks
- **Chain Addition** - Add new networks to MetaMask
- **Event Handling** - Listen to provider events (connect, disconnect, accountsChanged, chainChanged)
- **Connect & Sign** - Single-call connection and message signing

## Prerequisites

- Node.js 18.18+ or 20+
- Yarn or npm
- MetaMask browser extension installed

## Getting Started

### Installation

From the monorepo root:

```bash
# Install dependencies
yarn install

# Navigate to the playground directory
cd playground/legacy-evm-react-vite-playground
```

### Development

Start the development server:

```bash
yarn dev
```

Or with network access (for mobile testing):

```bash
yarn dev:host
```

The application will be available at `http://localhost:5173` (or the port shown in the terminal).

### Build

Build for production:

```bash
yarn build
```

Preview the production build:

```bash
yarn preview
```

## Available Actions

The playground demonstrates the following actions:

1. **Request Accounts** - Connect to MetaMask and request account access
2. **Connect & Sign** - Connect and sign a message in one operation
3. **Personal Sign** - Sign a message using `personal_sign`
4. **Sign Typed Data v4** - Sign structured data using `eth_signTypedData_v4`
5. **Send Transaction** - Send an Ethereum transaction
6. **Add Ethereum Chain** - Add Polygon network to MetaMask
7. **Switch Network** - Switch between Ethereum Mainnet, Goerli, and Sepolia
8. **Terminate** - Disconnect from MetaMask

## Project Structure

```
legacy-evm-react-vite-playground/
├── src/
│   ├── App.tsx           # Main application component
│   ├── App.css           # Application styles
│   ├── SignHelpers.ts    # Helper functions for signing
│   ├── main.tsx          # Application entry point
│   └── index.css         # Global styles
├── package.json
├── vite.config.ts        # Vite configuration
└── tsconfig.json         # TypeScript configuration
```

## Technologies Used

- **React 18** - UI framework
- **Vite** - Build tool and dev server
- **TypeScript** - Type safety
- **@metamask/connect-evm** - MetaMask connection SDK

## Troubleshooting

### Connection Issues

- Ensure MetaMask extension is installed and unlocked
- Check that the dapp URL matches what's configured in the SDK options
- Try disconnecting and reconnecting

### Build Issues

- Make sure all dependencies are installed: `yarn install`
- Clear node_modules and reinstall if needed
- Check that you're using the correct Node.js version

## Learn More

- [@metamask/connect-evm Documentation](../../packages/connect-evm/README.md)
- [MetaMask Documentation](https://docs.metamask.io)
- [EIP-1193 Specification](https://eips.ethereum.org/EIPS/eip-1193)

## Contributing

This playground is part of the MetaMask Connect monorepo. For contribution guidelines, see the [monorepo README](../../README.md).
