import { useCallback, useEffect, useRef, useState } from 'react';
import { createClient } from 'genlayer-js';
import { studionet } from 'genlayer-js/chains';
import { TransactionStatus } from 'genlayer-js/types';
import { CONTRACT_ADDRESS, STUDIONET_CONFIG } from '../config/chains';

export class TimeoutError extends Error {
  txHash: string;
  isTimeout = true;
  constructor(hash: string) {
    super(
      `Consensus is taking longer than expected. Your transaction was submitted — you can check its status directly on the explorer.`
    );
    this.txHash = hash;
  }
}

async function ensureChain() {
  const eth = (window as any).ethereum;
  if (!eth) return;
  try {
    await eth.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: STUDIONET_CONFIG.chainId }],
    });
  } catch (err: any) {
    if (err && err.code === 4902) {
      await eth.request({ method: 'wallet_addEthereumChain', params: [STUDIONET_CONFIG] });
      await eth.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: STUDIONET_CONFIG.chainId }],
      });
    } else if (err && err.code === -32002) {
      await new Promise((r) => setTimeout(r, 3000));
    } else {
      throw err;
    }
  }
}

export function useGenLayer() {
  const [account, setAccount] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const readClientRef = useRef(createClient({ chain: studionet }));

  useEffect(() => {
    const eth = (window as any).ethereum;
    if (!eth) return;
    eth
      .request({ method: 'eth_accounts' })
      .then((accounts: string[]) => {
        if (accounts[0]) setAccount(accounts[0]);
      })
      .catch(() => {});
    const handleAccountsChanged = (accounts: string[]) => setAccount(accounts[0] || null);
    if (eth.on) eth.on('accountsChanged', handleAccountsChanged);
    return () => {
      if (eth.removeListener) eth.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  const connect = useCallback(async () => {
    const eth = (window as any).ethereum;
    if (!eth) {
      throw new Error('No wallet found. Install a browser wallet extension to continue.');
    }
    setConnecting(true);
    try {
      const accounts: string[] = await eth.request({ method: 'eth_requestAccounts' });
      await ensureChain();
      setAccount(accounts[0] || null);
    } finally {
      setConnecting(false);
    }
  }, []);

  const getReadClient = useCallback(() => readClientRef.current, []);

  const getWriteClient = useCallback(() => {
    const eth = (window as any).ethereum;
    if (!eth || !account) throw new Error('Connect a wallet first.');
    return createClient({
      chain: studionet,
      account: account as `0x${string}`,
      provider: eth,
    });
  }, [account]);

  const read = useCallback(
    async <T = any>(method: string, args: any[] = []): Promise<T> => {
      const client = getReadClient();
      const raw = await client.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: method,
        args,
      });
      return typeof raw === 'string' ? (JSON.parse(raw) as T) : (raw as T);
    },
    [getReadClient]
  );

  const write = useCallback(
    async (method: string, args: any[] = [], value: bigint = BigInt(0)) => {
      await ensureChain();
      const client = getWriteClient();
      if (typeof (client as any).connect === 'function') {
        try {
          await (client as any).connect('studionet');
        } catch {
          // defensive: not every SDK version exposes this method
        }
      }
      const hash = await client.writeContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        functionName: method,
        args,
        value,
      });
      try {
        const receipt: any = await client.waitForTransactionReceipt({
          hash,
          status: TransactionStatus.ACCEPTED,
          retries: 120,
          interval: 4000,
        });
        // The contract's return value (e.g. a newly created ID) lives on
        // the leader receipt, not as a top-level field on the tx receipt.
        // Confirmed by reading genlayer-js's own simplifyTransactionReceipt
        // source (dist/index.js) rather than assumed: the simplified
        // receipt's consensus_data.leader_receipt[0].result carries it.
        // Extract it defensively — if the wire shape differs from what
        // was confirmed there, callers fall back to a null returnValue
        // and re-read state instead of trusting a guessed field name.
        let returnValue: string | null = null;
        try {
          const leaderReceipt = receipt?.consensus_data?.leader_receipt;
          const first = Array.isArray(leaderReceipt) ? leaderReceipt[0] : leaderReceipt;
          const raw = first?.result;
          if (typeof raw === 'string') {
            // raw may already be plain text, or may need JSON parsing if
            // the contract's return was JSON-encoded.
            try {
              returnValue = JSON.parse(raw);
            } catch {
              returnValue = raw;
            }
          } else if (raw !== undefined && raw !== null) {
            returnValue = raw;
          }
        } catch {
          returnValue = null;
        }
        return { hash, receipt, returnValue };
      } catch (err) {
        throw new TimeoutError(hash as unknown as string);
      }
    },
    [getWriteClient]
  );

  return { account, connecting, connect, read, write };
}
