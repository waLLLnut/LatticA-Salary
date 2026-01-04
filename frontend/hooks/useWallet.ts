'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  connectWallet,
  disconnectWallet,
  getWalletState,
  onWalletChange,
  isMetaMaskInstalled,
  getUSDTBalance,
  isAdmin,
  shortenAddress,
  MANTLE_SEPOLIA,
} from '@/lib/wallet';

interface UseWalletReturn {
  // State
  connected: boolean;
  address: string | null;
  shortAddress: string;
  chainId: number | null;
  isCorrectNetwork: boolean;
  isAdmin: boolean;
  usdtBalance: string;

  // Actions
  connect: () => Promise<void>;
  disconnect: () => void;

  // Status
  isLoading: boolean;
  error: string | null;
  hasMetaMask: boolean;
}

export function useWallet(): UseWalletReturn {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [adminStatus, setAdminStatus] = useState(false);
  const [usdtBalance, setUsdtBalance] = useState('0.00');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check initial state
  useEffect(() => {
    const state = getWalletState();
    setConnected(state.connected);
    setAddress(state.address);
    setChainId(state.chainId);
  }, []);

  // Subscribe to wallet changes
  useEffect(() => {
    const unsubscribe = onWalletChange((state) => {
      setConnected(state.connected);
      setAddress(state.address);
      setChainId(state.chainId);
    });

    return unsubscribe;
  }, []);

  // Fetch admin status and balance when connected
  useEffect(() => {
    if (connected && address) {
      // Check admin status
      isAdmin(address).then(setAdminStatus).catch(() => setAdminStatus(false));

      // Get USDT balance
      getUSDTBalance(address).then(setUsdtBalance).catch(() => setUsdtBalance('0.00'));
    } else {
      setAdminStatus(false);
      setUsdtBalance('0.00');
    }
  }, [connected, address]);

  const connect = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      await connectWallet();
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    disconnectWallet();
  }, []);

  return {
    connected,
    address,
    shortAddress: address ? shortenAddress(address) : '',
    chainId,
    isCorrectNetwork: chainId === MANTLE_SEPOLIA.chainId,
    isAdmin: adminStatus,
    usdtBalance,
    connect,
    disconnect,
    isLoading,
    error,
    hasMetaMask: typeof window !== 'undefined' && isMetaMaskInstalled(),
  };
}
