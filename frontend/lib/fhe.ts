/**
 * FHE16 WASM Module Wrapper
 *
 * Browser-side FHE encryption using WASM
 *
 * Copyright (c) 2025 waLLLnut
 * Project: LatticA
 * License: BSL 1.1 (Change Date: 2030-01-01, Change License: Apache-2.0)
 *
 * Contact: walllnut@walllnut.com
 * Maintainer: Seunghwan Lee <shlee@walllnut.com>
 */

declare global {
  interface Window {
    createFHE16: (options: { locateFile: (path: string) => string }) => Promise<FHE16Module>;
  }
}

interface FHE16Module {
  _malloc: (size: number) => number;
  _free: (ptr: number) => void;
  _FHE16_init_params: (n: number, N: number, q: number, Q: number, sigma: number) => void;
  _FHE16_set_pk: (ptr: number, length: number) => void;
  _FHE16_load_pk_from_fs: (path: number) => number;
  _FHE16_ENC_WASM: (msg: number, bits: number) => number;
  _FHE16_ENC_BIN: (msg: number, bits: number, outPtr: number) => number;
  _FHE16_DEC: (ctPtr: number, skPtr: number, bits: number) => number;
  _FHE16_free: (ptr: number) => void;
  HEAP8: Int8Array;
  HEAPU8: Uint8Array;
  HEAP32: Int32Array;
  UTF8ToString: (ptr: number) => string;
  stringToUTF8: (str: string, ptr: number, maxBytes: number) => void;
}

// FHE16 parameters (from LatticA)
const FHE_PARAMS = {
  n: 1024,
  N: 1025,
  q: 163603459,
  Q: 163603459,
  sigma: 10.0,
};

// Ciphertext size (16 + 1040 * 32 = 33296 int32 values)
const CT_SIZE_INT32 = 33296;
const CT_SIZE_BYTES = CT_SIZE_INT32 * 4;

class FHE16Client {
  private module: FHE16Module | null = null;
  private initialized = false;
  private pkLoaded = false;

  /**
   * Initialize FHE16 WASM module
   */
  async init(): Promise<void> {
    if (this.initialized) return;

    // Load WASM module
    if (typeof window === 'undefined') {
      throw new Error('FHE16 can only run in browser environment');
    }

    // Dynamically load the script if not already loaded
    if (!window.createFHE16) {
      await this.loadScript('/fhe16.js');
    }

    this.module = await window.createFHE16({
      locateFile: (path: string) => `/${path}`,
    });

    // Initialize parameters
    this.module._FHE16_init_params(
      FHE_PARAMS.n,
      FHE_PARAMS.N,
      FHE_PARAMS.q,
      FHE_PARAMS.Q,
      FHE_PARAMS.sigma
    );

    this.initialized = true;
    console.log('🔐 FHE16 WASM module initialized');
  }

  /**
   * Load public key from server
   */
  async loadPublicKey(): Promise<void> {
    if (!this.initialized) {
      await this.init();
    }
    if (this.pkLoaded) return;

    const response = await fetch('/pk.bin');
    if (!response.ok) {
      throw new Error('Failed to load public key (pk.bin)');
    }

    const pkBytes = new Uint8Array(await response.arrayBuffer());
    const pkPtr = this.module!._malloc(pkBytes.byteLength);
    this.module!.HEAPU8.set(pkBytes, pkPtr);
    this.module!._FHE16_set_pk(pkPtr, pkBytes.length / 4);
    this.module!._free(pkPtr);

    this.pkLoaded = true;
    console.log('🔑 FHE16 public key loaded');
  }

  /**
   * Encrypt a number (e.g., salary amount)
   * @param value - The number to encrypt (e.g., 5000 for $5000)
   * @param bits - Bit width (default: 32 for int32)
   * @returns Encrypted ciphertext as comma-separated string
   */
  async encrypt(value: number, bits: number = 32): Promise<string> {
    if (!this.pkLoaded) {
      await this.loadPublicKey();
    }

    const ctPtr = this.module!._FHE16_ENC_WASM(value, bits);
    const ctString = this.module!.UTF8ToString(ctPtr);
    this.module!._FHE16_free(ctPtr);

    return ctString;
  }

  /**
   * Encrypt a number and return as Uint8Array (binary format)
   * @param value - The number to encrypt
   * @param bits - Bit width (default: 32)
   * @returns Encrypted ciphertext as binary
   */
  async encryptBinary(value: number, bits: number = 32): Promise<Uint8Array> {
    if (!this.pkLoaded) {
      await this.loadPublicKey();
    }

    const outPtr = this.module!._malloc(CT_SIZE_BYTES);
    this.module!._FHE16_ENC_BIN(value, bits, outPtr);

    const result = new Uint8Array(CT_SIZE_BYTES);
    result.set(this.module!.HEAPU8.subarray(outPtr, outPtr + CT_SIZE_BYTES));
    this.module!._free(outPtr);

    return result;
  }

  /**
   * Encrypt payslip data
   * @param payslip - Payslip data object
   * @returns Encrypted payslip with CID
   */
  async encryptPayslip(payslip: {
    baseSalary: number;
    tax: number;
    otherDeductions: number;
    netAmount: number;
    period: string;
    employeeId: string;
  }): Promise<{
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
  }> {
    // Encrypt each field
    const [encBase, encTax, encOther, encNet] = await Promise.all([
      this.encrypt(Math.round(payslip.baseSalary * 100)), // Convert to cents
      this.encrypt(Math.round(payslip.tax * 100)),
      this.encrypt(Math.round(payslip.otherDeductions * 100)),
      this.encrypt(Math.round(payslip.netAmount * 100)),
    ]);

    const encryptedPayslip = {
      encryptedData: {
        baseSalary: encBase,
        tax: encTax,
        otherDeductions: encOther,
        netAmount: encNet,
      },
      metadata: {
        period: payslip.period,
        employeeId: payslip.employeeId,
        scheme: 'FHE16_0.0.1v',
        timestamp: Date.now(),
      },
      cid: '', // Will be computed below
    };

    // Generate CID (SHA-256 hash)
    const dataString = JSON.stringify(encryptedPayslip.encryptedData);
    const hashBuffer = await crypto.subtle.digest(
      'SHA-256',
      new TextEncoder().encode(dataString)
    );
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    encryptedPayslip.cid = '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

    return encryptedPayslip;
  }

  /**
   * Parse ciphertext string to Int32Array
   */
  parseCiphertext(ctString: string): Int32Array {
    const values = ctString.split(',').map(s => parseInt(s.trim()));
    return new Int32Array(values);
  }

  /**
   * Check if module is ready
   */
  isReady(): boolean {
    return this.initialized && this.pkLoaded;
  }

  /**
   * Load external script dynamically
   */
  private loadScript(src: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
      document.head.appendChild(script);
    });
  }
}

// Singleton instance
export const fhe16 = new FHE16Client();

// Utility functions
export async function encryptSalary(amount: number): Promise<string> {
  return fhe16.encrypt(Math.round(amount * 100)); // Convert to cents
}

export async function encryptPayslip(data: Parameters<typeof fhe16.encryptPayslip>[0]) {
  return fhe16.encryptPayslip(data);
}

export function generateCID(data: string): Promise<string> {
  return crypto.subtle.digest('SHA-256', new TextEncoder().encode(data))
    .then(buffer => {
      const hashArray = Array.from(new Uint8Array(buffer));
      return '0x' + hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    });
}
