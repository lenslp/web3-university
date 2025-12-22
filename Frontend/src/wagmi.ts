import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
  mainnet,
  sepolia,
  hardhat,
} from 'wagmi/chains';
import { http } from 'viem';

// WalletConnect Project ID
const projectId = process.env.NEXT_PUBLIC_WALLET_CONNECT_PROJECT_ID || '';

// Local Hardhat chain config
const localhostChain = {
  ...hardhat,
  rpcUrls: {
    default: { http: ['http://127.0.0.1:8545'] },
    public: { http: ['http://127.0.0.1:8545'] },
  },
};

export const config = getDefaultConfig({
  appName: 'Web3 University',
  projectId,
  chains: [
    mainnet,
    sepolia,
    localhostChain,
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [localhostChain.id]: http('http://127.0.0.1:8545'),
  },
  ssr: false,
});
