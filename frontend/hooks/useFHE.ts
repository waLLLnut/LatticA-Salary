/**
 * useFHE Hook - FHE16 Encryption React Hook
 *
 * Copyright (c) 2025 waLLLnut
 * Project: LatticA
 * License: BSL 1.1 (Change Date: 2030-01-01, Change License: Apache-2.0)
 *
 * Contact: walllnut@walllnut.com
 * Maintainer: Seunghwan Lee <shlee@walllnut.com>
 */

'use client';

import { useState, useCallback } from 'react';
import { fhe16, encryptPayslip, generateCID } from '@/lib/fhe';

interface UseFHEReturn {
  // State
  isReady: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  initialize: () => Promise<void>;
  encrypt: (value: number) => Promise<string>;
  encryptPayslipData: (data: PayslipData) => Promise<EncryptedPayslip>;
  generateCommitment: (data: string) => Promise<string>;
}

interface PayslipData {
  baseSalary: number;
  tax: number;
  otherDeductions: number;
  netAmount: number;
  period: string;
  employeeId: string;
}

interface EncryptedPayslip {
  encryptedData: {
    baseSalary: string;
    tax: string;
    otherDeductions: string;
    netAmount: string;
  };
  metadata: {
    period: string;
    employeeId: string;
    scheme: string;
    timestamp: number;
  };
  cid: string;
}

export function useFHE(): UseFHEReturn {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initialize = useCallback(async () => {
    if (isReady) return;

    setIsLoading(true);
    setError(null);

    try {
      await fhe16.init();
      await fhe16.loadPublicKey();
      setIsReady(true);
    } catch (err: any) {
      setError(err.message || 'Failed to initialize FHE');
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [isReady]);

  const encrypt = useCallback(async (value: number): Promise<string> => {
    if (!isReady) {
      await initialize();
    }
    return fhe16.encrypt(value);
  }, [isReady, initialize]);

  const encryptPayslipData = useCallback(async (data: PayslipData): Promise<EncryptedPayslip> => {
    if (!isReady) {
      await initialize();
    }
    return encryptPayslip(data);
  }, [isReady, initialize]);

  const generateCommitment = useCallback(async (data: string): Promise<string> => {
    return generateCID(data);
  }, []);

  return {
    isReady,
    isLoading,
    error,
    initialize,
    encrypt,
    encryptPayslipData,
    generateCommitment,
  };
}
