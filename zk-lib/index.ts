/**
 * ZK Proof Generation Library
 *
 * Generates ZK proofs for confidential salary withdrawals
 * Uses snarkjs for proof generation (GPL-3.0 for demo)
 *
 * Copyright (c) 2025 waLLLnut
 * Project: LatticA
 * License: GPL-3.0 (required by snarkjs dependency)
 *
 * Contact: walllnut@walllnut.com
 * Maintainer: Seunghwan Lee <shlee@walllnut.com>
 */

// Note: In production, replace with arkworks-rs (MIT) for commercial use

export interface CommitmentInput {
  encryptedSalary: bigint;
  employeeSecret: bigint;
  nonce: bigint;
}

export interface WithdrawInput {
  // Public inputs
  commitment: bigint;
  nullifier: bigint;
  withdrawAmount: bigint;
  poolRoot: bigint;

  // Private inputs
  encryptedSalary: bigint;
  decryptedSalary: bigint;
  employeeSecret: bigint;
  nonce: bigint;
  pathElements: bigint[];
  pathIndices: number[];
}

export interface Proof {
  pi_a: [string, string, string];
  pi_b: [[string, string], [string, string], [string, string]];
  pi_c: [string, string, string];
  protocol: string;
  curve: string;
}

export interface PublicSignals {
  commitment: string;
  nullifier: string;
  withdrawAmount: string;
  poolRoot: string;
}

/**
 * Poseidon hash function (simplified for demo)
 * In production, use circomlibjs poseidon
 */
export async function poseidonHash(inputs: bigint[]): Promise<bigint> {
  // For demo: using simple hash
  // In production: use actual Poseidon from circomlibjs
  const { buildPoseidon } = await import('circomlibjs');
  const poseidon = await buildPoseidon();
  const hash = poseidon(inputs.map(i => BigInt(i)));
  return poseidon.F.toObject(hash);
}

/**
 * Generate a commitment from salary data
 */
export async function generateCommitment(input: CommitmentInput): Promise<bigint> {
  return poseidonHash([
    input.encryptedSalary,
    input.employeeSecret,
    input.nonce,
  ]);
}

/**
 * Generate a nullifier to prevent double-spending
 */
export async function generateNullifier(
  employeeSecret: bigint,
  nonce: bigint
): Promise<bigint> {
  return poseidonHash([employeeSecret, nonce]);
}

/**
 * Simple Merkle tree implementation
 */
export class MerkleTree {
  private levels: number;
  private leaves: bigint[];
  private layers: bigint[][];
  private zeroValues: bigint[];

  constructor(levels: number) {
    this.levels = levels;
    this.leaves = [];
    this.layers = [];
    this.zeroValues = [];
    this.initZeroValues();
  }

  private async initZeroValues() {
    // Initialize zero values for empty nodes
    let current = BigInt(0);
    this.zeroValues = [current];

    for (let i = 1; i <= this.levels; i++) {
      current = await poseidonHash([current, current]);
      this.zeroValues.push(current);
    }
  }

  async insert(leaf: bigint): Promise<number> {
    const index = this.leaves.length;
    this.leaves.push(leaf);
    await this.rebuild();
    return index;
  }

  async rebuild() {
    this.layers = [this.leaves.slice()];

    // Pad to power of 2
    const targetLength = Math.pow(2, this.levels);
    while (this.layers[0].length < targetLength) {
      this.layers[0].push(this.zeroValues[0]);
    }

    // Build layers
    for (let level = 0; level < this.levels; level++) {
      const currentLayer = this.layers[level];
      const nextLayer: bigint[] = [];

      for (let i = 0; i < currentLayer.length; i += 2) {
        const left = currentLayer[i];
        const right = currentLayer[i + 1] || this.zeroValues[level];
        const hash = await poseidonHash([left, right]);
        nextLayer.push(hash);
      }

      this.layers.push(nextLayer);
    }
  }

  getRoot(): bigint {
    if (this.layers.length === 0) return this.zeroValues[this.levels];
    return this.layers[this.layers.length - 1][0];
  }

  getProof(index: number): { pathElements: bigint[]; pathIndices: number[] } {
    const pathElements: bigint[] = [];
    const pathIndices: number[] = [];

    let currentIndex = index;

    for (let level = 0; level < this.levels; level++) {
      const isRight = currentIndex % 2 === 1;
      const siblingIndex = isRight ? currentIndex - 1 : currentIndex + 1;

      const sibling = this.layers[level][siblingIndex] || this.zeroValues[level];
      pathElements.push(sibling);
      pathIndices.push(isRight ? 1 : 0);

      currentIndex = Math.floor(currentIndex / 2);
    }

    return { pathElements, pathIndices };
  }
}

/**
 * Generate ZK proof for withdrawal
 * Note: This is a simplified version for demo
 * In production, use actual snarkjs prove function with compiled circuit
 */
export async function generateWithdrawProof(
  input: WithdrawInput,
  wasmPath: string,
  zkeyPath: string
): Promise<{ proof: Proof; publicSignals: PublicSignals }> {
  // Dynamic import snarkjs (GPL-3.0)
  const snarkjs = await import('snarkjs');

  // Prepare circuit inputs
  const circuitInputs = {
    // Public
    commitment: input.commitment.toString(),
    nullifier: input.nullifier.toString(),
    withdrawAmount: input.withdrawAmount.toString(),
    poolRoot: input.poolRoot.toString(),

    // Private
    encryptedSalary: input.encryptedSalary.toString(),
    decryptedSalary: input.decryptedSalary.toString(),
    employeeSecret: input.employeeSecret.toString(),
    nonce: input.nonce.toString(),
    pathElements: input.pathElements.map(e => e.toString()),
    pathIndices: input.pathIndices,
  };

  // Generate proof
  const { proof, publicSignals } = await snarkjs.groth16.fullProve(
    circuitInputs,
    wasmPath,
    zkeyPath
  );

  return {
    proof: proof as Proof,
    publicSignals: {
      commitment: publicSignals[0],
      nullifier: publicSignals[1],
      withdrawAmount: publicSignals[2],
      poolRoot: publicSignals[3],
    },
  };
}

/**
 * Verify ZK proof
 */
export async function verifyProof(
  proof: Proof,
  publicSignals: PublicSignals,
  vkeyPath: string
): Promise<boolean> {
  const snarkjs = await import('snarkjs');
  const vkey = await fetch(vkeyPath).then(r => r.json());

  return snarkjs.groth16.verify(
    vkey,
    [
      publicSignals.commitment,
      publicSignals.nullifier,
      publicSignals.withdrawAmount,
      publicSignals.poolRoot,
    ],
    proof
  );
}

/**
 * Convert proof to contract call format
 */
export function proofToContractFormat(proof: Proof): {
  proof: bigint[];
  formattedProof: string[];
} {
  const proofArray = [
    BigInt(proof.pi_a[0]),
    BigInt(proof.pi_a[1]),
    BigInt(proof.pi_b[0][1]),
    BigInt(proof.pi_b[0][0]),
    BigInt(proof.pi_b[1][1]),
    BigInt(proof.pi_b[1][0]),
    BigInt(proof.pi_c[0]),
    BigInt(proof.pi_c[1]),
  ];

  return {
    proof: proofArray,
    formattedProof: proofArray.map(p => p.toString()),
  };
}

/**
 * FHE16 + ZK Integration Helper
 *
 * Combines FHE16 encrypted salary with ZK proof generation
 */
export class ConfidentialSalaryManager {
  private merkleTree: MerkleTree;
  private commitmentToIndex: Map<string, number>;

  constructor(levels: number = 20) {
    this.merkleTree = new MerkleTree(levels);
    this.commitmentToIndex = new Map();
  }

  /**
   * Register a new salary commitment
   * Called by Admin after FHE16 encryption
   */
  async registerSalary(
    encryptedSalary: bigint,
    employeeSecret: bigint,
    nonce: bigint
  ): Promise<{ commitment: bigint; index: number }> {
    const commitment = await generateCommitment({
      encryptedSalary,
      employeeSecret,
      nonce,
    });

    const index = await this.merkleTree.insert(commitment);
    this.commitmentToIndex.set(commitment.toString(), index);

    return { commitment, index };
  }

  /**
   * Get current Merkle root
   */
  getMerkleRoot(): bigint {
    return this.merkleTree.getRoot();
  }

  /**
   * Prepare withdrawal proof inputs
   * Called by Employee
   */
  async prepareWithdrawal(
    encryptedSalary: bigint,
    decryptedSalary: bigint, // From FHE16.decrypt()
    employeeSecret: bigint,
    nonce: bigint
  ): Promise<WithdrawInput> {
    const commitment = await generateCommitment({
      encryptedSalary,
      employeeSecret,
      nonce,
    });

    const nullifier = await generateNullifier(employeeSecret, nonce);

    const index = this.commitmentToIndex.get(commitment.toString());
    if (index === undefined) {
      throw new Error('Commitment not found in tree');
    }

    const { pathElements, pathIndices } = this.merkleTree.getProof(index);

    return {
      commitment,
      nullifier,
      withdrawAmount: decryptedSalary,
      poolRoot: this.merkleTree.getRoot(),
      encryptedSalary,
      decryptedSalary,
      employeeSecret,
      nonce,
      pathElements,
      pathIndices,
    };
  }
}
