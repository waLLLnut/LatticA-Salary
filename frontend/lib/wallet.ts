/**
 * Wallet Connection & Contract Interaction
 *
 * Mantle Sepolia Network Integration
 *
 * Copyright (c) 2025 waLLLnut
 * Project: LatticA
 * License: LatticA Restrictive License v1.0
 *
 * This file is part of the LatticA project.
 * Commercial use is prohibited without explicit written permission.
 *
 * Contact: walllnut@walllnut.com
 * Maintainer: Seunghwan Lee <shlee@walllnut.com>
 */

import { ethers } from 'ethers';

// Network Configuration
export const MANTLE_SEPOLIA = {
  chainId: 5003,
  chainIdHex: '0x138b',
  name: 'Mantle Sepolia',
  rpcUrl: 'https://rpc.sepolia.mantle.xyz',
  explorerUrl: 'https://sepolia.mantlescan.xyz',
  currency: {
    name: 'MNT',
    symbol: 'MNT',
    decimals: 18,
  },
};

// Contract addresses (update after deployment)
export const CONTRACTS = {
  MOCK_USDT: '', // Deploy MockUSDT and add address
  PAYROLL: '',   // Deploy SalaryPayroll and add address
};

// MockUSDT ABI (minimal)
const USDT_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function decimals() view returns (uint8)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
];

// SalaryPayroll ABI (minimal)
const PAYROLL_ABI = [
  'function registerEmployee(string calldata empId, address wallet, bytes32 commitment) external',
  'function createBatch(bytes32 batchId, address[] calldata recipients, uint256[] calldata amounts, bytes32[] calldata commitments) external',
  'function approveBatch(bytes32 batchId) external',
  'function executeBatch(bytes32 batchId) external',
  'function isAdmin(address account) view returns (bool)',
  'function employees(address) view returns (string empId, address wallet, bytes32 commitment, bool active)',
  'event EmployeeRegistered(string indexed empId, address indexed wallet, bytes32 commitment)',
  'event BatchCreated(bytes32 indexed batchId, uint256 totalAmount, uint256 recipientCount)',
  'event BatchExecuted(bytes32 indexed batchId, uint256 totalAmount)',
];

// Wallet state
interface WalletState {
  connected: boolean;
  address: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.Signer | null;
}

const state: WalletState = {
  connected: false,
  address: null,
  chainId: null,
  provider: null,
  signer: null,
};

// Event listeners
type WalletEventCallback = (state: WalletState) => void;
const listeners: WalletEventCallback[] = [];

export function onWalletChange(callback: WalletEventCallback): () => void {
  listeners.push(callback);
  return () => {
    const idx = listeners.indexOf(callback);
    if (idx > -1) listeners.splice(idx, 1);
  };
}

function notifyListeners() {
  listeners.forEach(cb => cb({ ...state }));
}

/**
 * Check if MetaMask is installed
 */
export function isMetaMaskInstalled(): boolean {
  return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
}

/**
 * Connect wallet
 */
export async function connectWallet(): Promise<WalletState> {
  if (!isMetaMaskInstalled()) {
    throw new Error('MetaMask is not installed');
  }

  const ethereum = window.ethereum!;

  // Request accounts
  const accounts = await ethereum.request({
    method: 'eth_requestAccounts',
  }) as string[];

  if (accounts.length === 0) {
    throw new Error('No accounts found');
  }

  // Get chain ID
  const chainIdHex = await ethereum.request({ method: 'eth_chainId' }) as string;
  const chainId = parseInt(chainIdHex, 16);

  // Create provider and signer
  state.provider = new ethers.BrowserProvider(ethereum);
  state.signer = await state.provider.getSigner();
  state.address = accounts[0];
  state.chainId = chainId;
  state.connected = true;

  // Check if on correct network
  if (chainId !== MANTLE_SEPOLIA.chainId) {
    await switchToMantleSepolia();
  }

  // Setup event listeners
  ethereum.on('accountsChanged', handleAccountsChanged);
  ethereum.on('chainChanged', handleChainChanged);

  notifyListeners();
  return { ...state };
}

/**
 * Disconnect wallet
 */
export function disconnectWallet(): void {
  state.connected = false;
  state.address = null;
  state.chainId = null;
  state.provider = null;
  state.signer = null;

  notifyListeners();
}

/**
 * Get current wallet state
 */
export function getWalletState(): WalletState {
  return { ...state };
}

/**
 * Switch to Mantle Sepolia network
 */
export async function switchToMantleSepolia(): Promise<void> {
  if (!isMetaMaskInstalled()) return;

  const ethereum = window.ethereum!;

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: MANTLE_SEPOLIA.chainIdHex }],
    });
  } catch (error: any) {
    // Chain not added, try to add it
    if (error.code === 4902) {
      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: MANTLE_SEPOLIA.chainIdHex,
          chainName: MANTLE_SEPOLIA.name,
          nativeCurrency: MANTLE_SEPOLIA.currency,
          rpcUrls: [MANTLE_SEPOLIA.rpcUrl],
          blockExplorerUrls: [MANTLE_SEPOLIA.explorerUrl],
        }],
      });
    } else {
      throw error;
    }
  }
}

// Event handlers
async function handleAccountsChanged(accounts: string[]) {
  if (accounts.length === 0) {
    disconnectWallet();
  } else {
    state.address = accounts[0];
    if (state.provider) {
      state.signer = await state.provider.getSigner();
    }
    notifyListeners();
  }
}

function handleChainChanged(chainIdHex: string) {
  state.chainId = parseInt(chainIdHex, 16);
  notifyListeners();

  // Reload page on chain change (recommended by MetaMask)
  window.location.reload();
}

/**
 * Get USDT balance
 */
export async function getUSDTBalance(address?: string): Promise<string> {
  if (!state.provider || !CONTRACTS.MOCK_USDT) {
    return '0.00';
  }

  const targetAddress = address || state.address;
  if (!targetAddress) return '0.00';

  const usdt = new ethers.Contract(CONTRACTS.MOCK_USDT, USDT_ABI, state.provider);
  const balance = await usdt.balanceOf(targetAddress);
  const decimals = await usdt.decimals();

  return ethers.formatUnits(balance, decimals);
}

/**
 * Approve USDT spending
 */
export async function approveUSDT(amount: string): Promise<ethers.TransactionResponse> {
  if (!state.signer || !CONTRACTS.MOCK_USDT || !CONTRACTS.PAYROLL) {
    throw new Error('Wallet not connected or contracts not configured');
  }

  const usdt = new ethers.Contract(CONTRACTS.MOCK_USDT, USDT_ABI, state.signer);
  const decimals = await usdt.decimals();
  const amountWei = ethers.parseUnits(amount, decimals);

  return usdt.approve(CONTRACTS.PAYROLL, amountWei);
}

/**
 * Check if address is admin
 */
export async function isAdmin(address?: string): Promise<boolean> {
  if (!state.provider || !CONTRACTS.PAYROLL) {
    return false;
  }

  const targetAddress = address || state.address;
  if (!targetAddress) return false;

  const payroll = new ethers.Contract(CONTRACTS.PAYROLL, PAYROLL_ABI, state.provider);
  return payroll.isAdmin(targetAddress);
}

/**
 * Register employee on-chain
 */
export async function registerEmployee(
  empId: string,
  walletAddress: string,
  commitment: string
): Promise<ethers.TransactionResponse> {
  if (!state.signer || !CONTRACTS.PAYROLL) {
    throw new Error('Wallet not connected or contracts not configured');
  }

  const payroll = new ethers.Contract(CONTRACTS.PAYROLL, PAYROLL_ABI, state.signer);
  return payroll.registerEmployee(empId, walletAddress, commitment);
}

/**
 * Create payment batch
 */
export async function createBatch(
  batchId: string,
  recipients: string[],
  amounts: string[],
  commitments: string[]
): Promise<ethers.TransactionResponse> {
  if (!state.signer || !CONTRACTS.PAYROLL) {
    throw new Error('Wallet not connected or contracts not configured');
  }

  const payroll = new ethers.Contract(CONTRACTS.PAYROLL, PAYROLL_ABI, state.signer);
  const usdt = new ethers.Contract(CONTRACTS.MOCK_USDT, USDT_ABI, state.provider!);
  const decimals = await usdt.decimals();

  const amountsWei = amounts.map(a => ethers.parseUnits(a, decimals));

  return payroll.createBatch(batchId, recipients, amountsWei, commitments);
}

/**
 * Execute payment batch
 */
export async function executeBatch(batchId: string): Promise<ethers.TransactionResponse> {
  if (!state.signer || !CONTRACTS.PAYROLL) {
    throw new Error('Wallet not connected or contracts not configured');
  }

  const payroll = new ethers.Contract(CONTRACTS.PAYROLL, PAYROLL_ABI, state.signer);
  return payroll.executeBatch(batchId);
}

/**
 * Shorten address for display
 */
export function shortenAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Format USDT amount
 */
export function formatUSDT(amount: string | number): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

// TypeScript declarations for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: unknown[] }) => Promise<unknown>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
      isMetaMask?: boolean;
      chainId?: string;
    };
  }
}
