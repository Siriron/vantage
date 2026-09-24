// StudioNet only — this project targets StudioNet exclusively.
export const CHAIN_ID = 61999;
export const CHAIN_ID_HEX = '0xF22F';
export const RPC_URL = 'https://studio.genlayer.com/api';
export const EXPLORER_URL = 'https://explorer-studio.genlayer.com';

// Single plain constant. Update this one line after deploying via
// studio.genlayer.com — no .env, no dashboard, no build-time indirection.
export const CONTRACT_ADDRESS = '0x5F631527DAeeAB4742C4924a8220cBF3Ed3c44e8';

export const STUDIONET_CONFIG = {
  chainId: CHAIN_ID_HEX,
  chainName: 'GenLayer StudioNet',
  rpcUrls: [RPC_URL],
  nativeCurrency: { name: 'GEN', symbol: 'GEN', decimals: 18 },
  blockExplorerUrls: [EXPLORER_URL],
};

export const EXPLORER_TX_URL = (hash: string) => `${EXPLORER_URL}/tx/${hash}`;
export const EXPLORER_ADDRESS_URL = (address: string) => `${EXPLORER_URL}/address/${address}`;
