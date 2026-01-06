/**
 * Confidential Salary Module
 *
 * Integrates FHE16 encryption with ZK proofs for confidential withdrawals
 *
 * Copyright (c) 2025 waLLLnut
 * Project: LatticA
 * License: BSL 1.1 (Change Date: 2030-01-01, Change License: Apache-2.0)
 *
 * Contact: walllnut@walllnut.com
 * Maintainer: Seunghwan Lee <shlee@walllnut.com>
 */

import { fhe16, generateCID } from './fhe';

// ============ Types ============

export interface EncryptedSalaryData {
  encryptedSalary: string;      // FHE16 ciphertext
  commitment: string;            // Poseidon hash for on-chain
  nonce: string;                 // Random nonce
  employeeAddress: string;
  period: string;
}

export interface WithdrawalProof {
  proof: string[];               // ZK proof components
  publicSignals: string[];       // Public inputs
  nullifier: string;
  amount: string;
}

export interface SalaryRegistration {
  employeeId: string;
  employeeAddress: string;
  encryptedData: EncryptedSalaryData;
  timestamp: number;
}

// ============ Constants ============

const STORAGE_KEY_SALARIES = 'lattica_encrypted_salaries';
const STORAGE_KEY_SECRETS = 'lattica_employee_secrets';

// ============ Poseidon Hash (Simplified) ============

/**
 * Simple hash function for demo
 * In production: use circomlibjs poseidon
 */
async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  // For demo: use SHA256 as placeholder
  // Real implementation would use Poseidon
  const encoder = new TextEncoder();
  const data = encoder.encode(inputs.map(i => i.toString()).join(','));
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = new Uint8Array(hashBuffer);
  let result = BigInt(0);
  for (let i = 0; i < 8; i++) {
    result = (result << BigInt(32)) | BigInt(hashArray[i * 4] << 24 | hashArray[i * 4 + 1] << 16 | hashArray[i * 4 + 2] << 8 | hashArray[i * 4 + 3]);
  }
  return result;
}

// ============ Merkle Tree ============

class SimpleMerkleTree {
  private levels: number;
  private leaves: bigint[];

  constructor(levels: number = 20) {
    this.levels = levels;
    this.leaves = [];
  }

  async insert(leaf: bigint): Promise<number> {
    const index = this.leaves.length;
    this.leaves.push(leaf);
    return index;
  }

  async getRoot(): Promise<bigint> {
    if (this.leaves.length === 0) return BigInt(0);

    let layer = [...this.leaves];

    // Pad to power of 2
    while (layer.length < Math.pow(2, this.levels)) {
      layer.push(BigInt(0));
    }

    // Build tree
    for (let level = 0; level < this.levels; level++) {
      const nextLayer: bigint[] = [];
      for (let i = 0; i < layer.length; i += 2) {
        const hash = await poseidonHash([layer[i], layer[i + 1] || BigInt(0)]);
        nextLayer.push(hash);
      }
      layer = nextLayer;
    }

    return layer[0];
  }

  async getProof(index: number): Promise<{ pathElements: bigint[]; pathIndices: number[] }> {
    const pathElements: bigint[] = [];
    const pathIndices: number[] = [];

    let layer = [...this.leaves];
    while (layer.length < Math.pow(2, this.levels)) {
      layer.push(BigInt(0));
    }

    let currentIndex = index;

    for (let level = 0; level < this.levels; level++) {
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;

      pathElements.push(layer[siblingIndex] || BigInt(0));
      pathIndices.push(isRight ? 1 : 0);

      // Build next layer
      const nextLayer: bigint[] = [];
      for (let i = 0; i < layer.length; i += 2) {
        const hash = await poseidonHash([layer[i], layer[i + 1] || BigInt(0)]);
        nextLayer.push(hash);
      }
      layer = nextLayer;
      currentIndex = Math.floor(currentIndex / 2);
    }

    return { pathElements, pathIndices };
  }

  getLeaves(): bigint[] {
    return [...this.leaves];
  }
}

// ============ Main Class ============

/**
 * ConfidentialSalary
 *
 * Manages FHE16 + ZK integration for confidential salary payments
 */
export class ConfidentialSalary {
  private merkleTree: SimpleMerkleTree;
  private registrations: Map<string, SalaryRegistration>;
  private commitmentToIndex: Map<string, number>;

  constructor() {
    this.merkleTree = new SimpleMerkleTree(20);
    this.registrations = new Map();
    this.commitmentToIndex = new Map();
    this.loadFromStorage();
  }

  private loadFromStorage() {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY_SALARIES);
      if (stored) {
        const data = JSON.parse(stored);
        data.forEach((reg: SalaryRegistration) => {
          this.registrations.set(reg.employeeAddress, reg);
        });
      }
    } catch (e) {
      console.error('Failed to load from storage:', e);
    }
  }

  private saveToStorage() {
    if (typeof window === 'undefined') return;

    try {
      const data = Array.from(this.registrations.values());
      localStorage.setItem(STORAGE_KEY_SALARIES, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to save to storage:', e);
    }
  }

  /**
   * Generate employee secret (stored locally)
   */
  async generateEmployeeSecret(employeeAddress: string): Promise<bigint> {
    // Generate random secret
    const randomBytes = new Uint8Array(32);
    crypto.getRandomValues(randomBytes);
    const secret = BigInt('0x' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join(''));

    // Store encrypted in localStorage
    if (typeof window !== 'undefined') {
      const secrets = JSON.parse(localStorage.getItem(STORAGE_KEY_SECRETS) || '{}');
      secrets[employeeAddress] = secret.toString();
      localStorage.setItem(STORAGE_KEY_SECRETS, JSON.stringify(secrets));
    }

    return secret;
  }

  /**
   * Get stored employee secret
   */
  getEmployeeSecret(employeeAddress: string): bigint | null {
    if (typeof window === 'undefined') return null;

    const secrets = JSON.parse(localStorage.getItem(STORAGE_KEY_SECRETS) || '{}');
    return secrets[employeeAddress] ? BigInt(secrets[employeeAddress]) : null;
  }

  /**
   * Register encrypted salary (Admin)
   *
   * 1. Encrypt salary with FHE16
   * 2. Generate commitment
   * 3. Add to Merkle tree
   */
  async registerSalary(
    employeeId: string,
    employeeAddress: string,
    salaryAmount: number,
    period: string
  ): Promise<EncryptedSalaryData> {
    // 1. Initialize FHE16
    await fhe16.init();
    await fhe16.loadPublicKey();

    // 2. Encrypt salary with FHE16
    const encryptedSalary = await fhe16.encrypt(salaryAmount);

    // 3. Generate nonce
    const nonceBytes = new Uint8Array(16);
    crypto.getRandomValues(nonceBytes);
    const nonce = BigInt('0x' + Array.from(nonceBytes).map(b => b.toString(16).padStart(2, '0')).join(''));

    // 4. Generate employee secret (in real system, employee generates this)
    const employeeSecret = await this.generateEmployeeSecret(employeeAddress);

    // 5. Convert encrypted salary to bigint for commitment
    const encryptedSalaryBigInt = BigInt('0x' + await generateCID(encryptedSalary));

    // 6. Generate commitment: Poseidon(encryptedSalary, employeeSecret, nonce)
    const commitment = await poseidonHash([encryptedSalaryBigInt, employeeSecret, nonce]);

    // 7. Add to Merkle tree
    const index = await this.merkleTree.insert(commitment);
    this.commitmentToIndex.set(commitment.toString(), index);

    // 8. Store registration
    const registration: SalaryRegistration = {
      employeeId,
      employeeAddress,
      encryptedData: {
        encryptedSalary,
        commitment: commitment.toString(),
        nonce: nonce.toString(),
        employeeAddress,
        period,
      },
      timestamp: Date.now(),
    };

    this.registrations.set(employeeAddress, registration);
    this.saveToStorage();

    console.log('✅ Salary registered:', {
      employeeId,
      commitment: commitment.toString().slice(0, 20) + '...',
      merkleIndex: index,
    });

    return registration.encryptedData;
  }

  /**
   * Get Merkle root for on-chain registration
   */
  async getMerkleRoot(): Promise<string> {
    const root = await this.merkleTree.getRoot();
    return root.toString();
  }

  /**
   * Prepare withdrawal (Employee)
   *
   * 1. Get encrypted salary
   * 2. Decrypt with FHE16
   * 3. Generate ZK proof inputs
   */
  async prepareWithdrawal(employeeAddress: string): Promise<{
    amount: number;
    proofInputs: {
      commitment: string;
      nullifier: string;
      withdrawAmount: string;
      poolRoot: string;
      pathElements: string[];
      pathIndices: number[];
    };
  } | null> {
    // 1. Get registration
    const registration = this.registrations.get(employeeAddress);
    if (!registration) {
      console.error('No salary registration found');
      return null;
    }

    // 2. Get employee secret
    const employeeSecret = this.getEmployeeSecret(employeeAddress);
    if (!employeeSecret) {
      console.error('Employee secret not found');
      return null;
    }

    // 3. Initialize FHE16 and decrypt (in real system)
    // For demo, we'll use a placeholder
    // In production: const decryptedAmount = await fhe16.decrypt(registration.encryptedData.encryptedSalary);
    const decryptedAmount = 5000; // Placeholder

    // 4. Generate nullifier
    const nonce = BigInt(registration.encryptedData.nonce);
    const nullifier = await poseidonHash([employeeSecret, nonce]);

    // 5. Get Merkle proof
    const commitment = BigInt(registration.encryptedData.commitment);
    const index = this.commitmentToIndex.get(commitment.toString());

    if (index === undefined) {
      console.error('Commitment not found in tree');
      return null;
    }

    const { pathElements, pathIndices } = await this.merkleTree.getProof(index);
    const poolRoot = await this.merkleTree.getRoot();

    return {
      amount: decryptedAmount,
      proofInputs: {
        commitment: commitment.toString(),
        nullifier: nullifier.toString(),
        withdrawAmount: decryptedAmount.toString(),
        poolRoot: poolRoot.toString(),
        pathElements: pathElements.map(e => e.toString()),
        pathIndices,
      },
    };
  }

  /**
   * Generate ZK proof for withdrawal (simplified for demo)
   *
   * In production: use snarkjs with compiled circuit
   */
  async generateWithdrawProof(employeeAddress: string): Promise<WithdrawalProof | null> {
    const preparation = await this.prepareWithdrawal(employeeAddress);
    if (!preparation) return null;

    // For demo: generate mock proof
    // In production: use snarkjs.groth16.fullProve()

    const mockProof: WithdrawalProof = {
      proof: [
        '0x' + '1'.repeat(64), // pi_a[0]
        '0x' + '2'.repeat(64), // pi_a[1]
        '0x' + '3'.repeat(64), // pi_b[0][0]
        '0x' + '4'.repeat(64), // pi_b[0][1]
        '0x' + '5'.repeat(64), // pi_b[1][0]
        '0x' + '6'.repeat(64), // pi_b[1][1]
        '0x' + '7'.repeat(64), // pi_c[0]
        '0x' + '8'.repeat(64), // pi_c[1]
      ],
      publicSignals: [
        preparation.proofInputs.commitment,
        preparation.proofInputs.nullifier,
        preparation.proofInputs.withdrawAmount,
        preparation.proofInputs.poolRoot,
      ],
      nullifier: preparation.proofInputs.nullifier,
      amount: preparation.amount.toString(),
    };

    console.log('✅ ZK Proof generated (demo mode):', {
      nullifier: mockProof.nullifier.slice(0, 20) + '...',
      amount: mockProof.amount,
    });

    return mockProof;
  }

  /**
   * Get all registrations (Admin view)
   */
  getAllRegistrations(): SalaryRegistration[] {
    return Array.from(this.registrations.values());
  }

  /**
   * Get registration for specific employee
   */
  getRegistration(employeeAddress: string): SalaryRegistration | undefined {
    return this.registrations.get(employeeAddress);
  }
}

// Singleton instance
export const confidentialSalary = new ConfidentialSalary();
