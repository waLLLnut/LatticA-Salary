/**
 * useConfidential Hook
 *
 * React hook for confidential salary operations
 *
 * Copyright (c) 2025 waLLLnut
 * Project: LatticA
 * License: BSL 1.1 (Change Date: 2030-01-01, Change License: Apache-2.0)
 *
 * Contact: walllnut@walllnut.com
 * Maintainer: Seunghwan Lee <shlee@walllnut.com>
 */

'use client';

import { useState, useCallback, useEffect } from 'react';
import {
  confidentialSalary,
  EncryptedSalaryData,
  SalaryRegistration,
  WithdrawalProof,
} from '@/lib/confidential';

interface UseConfidentialReturn {
  // State
  isLoading: boolean;
  error: string | null;
  merkleRoot: string | null;
  registrations: SalaryRegistration[];

  // Admin actions
  registerSalary: (
    employeeId: string,
    employeeAddress: string,
    amount: number,
    period: string
  ) => Promise<EncryptedSalaryData | null>;

  // Employee actions
  prepareWithdrawal: (employeeAddress: string) => Promise<{
    amount: number;
    proofInputs: {
      commitment: string;
      nullifier: string;
      withdrawAmount: string;
      poolRoot: string;
    };
  } | null>;

  generateProof: (employeeAddress: string) => Promise<WithdrawalProof | null>;

  // Utility
  getRegistration: (employeeAddress: string) => SalaryRegistration | undefined;
  refreshMerkleRoot: () => Promise<void>;
}

export function useConfidential(): UseConfidentialReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [merkleRoot, setMerkleRoot] = useState<string | null>(null);
  const [registrations, setRegistrations] = useState<SalaryRegistration[]>([]);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        const root = await confidentialSalary.getMerkleRoot();
        setMerkleRoot(root);
        setRegistrations(confidentialSalary.getAllRegistrations());
      } catch (e) {
        console.error('Failed to load confidential data:', e);
      }
    };
    loadData();
  }, []);

  // Register salary (Admin)
  const registerSalary = useCallback(async (
    employeeId: string,
    employeeAddress: string,
    amount: number,
    period: string
  ): Promise<EncryptedSalaryData | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const encryptedData = await confidentialSalary.registerSalary(
        employeeId,
        employeeAddress,
        amount,
        period
      );

      // Update state
      const newRoot = await confidentialSalary.getMerkleRoot();
      setMerkleRoot(newRoot);
      setRegistrations(confidentialSalary.getAllRegistrations());

      return encryptedData;
    } catch (e: any) {
      setError(e.message || 'Failed to register salary');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Prepare withdrawal (Employee)
  const prepareWithdrawal = useCallback(async (employeeAddress: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const result = await confidentialSalary.prepareWithdrawal(employeeAddress);
      return result;
    } catch (e: any) {
      setError(e.message || 'Failed to prepare withdrawal');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Generate ZK proof (Employee)
  const generateProof = useCallback(async (employeeAddress: string): Promise<WithdrawalProof | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const proof = await confidentialSalary.generateWithdrawProof(employeeAddress);
      return proof;
    } catch (e: any) {
      setError(e.message || 'Failed to generate proof');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get registration
  const getRegistration = useCallback((employeeAddress: string) => {
    return confidentialSalary.getRegistration(employeeAddress);
  }, []);

  // Refresh Merkle root
  const refreshMerkleRoot = useCallback(async () => {
    const root = await confidentialSalary.getMerkleRoot();
    setMerkleRoot(root);
    setRegistrations(confidentialSalary.getAllRegistrations());
  }, []);

  return {
    isLoading,
    error,
    merkleRoot,
    registrations,
    registerSalary,
    prepareWithdrawal,
    generateProof,
    getRegistration,
    refreshMerkleRoot,
  };
}
