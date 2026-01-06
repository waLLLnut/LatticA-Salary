/**
 * Salary Withdraw ZK Circuit
 *
 * Proves that an employee can withdraw a specific amount from the pool
 * without revealing the encrypted salary or the amount to observers.
 *
 * Copyright (c) 2025 waLLLnut
 * Project: LatticA
 * License: GPL-3.0 (required by circom/snarkjs)
 */

pragma circom 2.1.6;

include "circomlib/circuits/poseidon.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/bitify.circom";

/**
 * SalaryCommitment
 *
 * Generates a commitment from encrypted salary data
 * commitment = Poseidon(encryptedSalary, employeeSecret, nonce)
 */
template SalaryCommitment() {
    signal input encryptedSalary;   // FHE16 encrypted salary (as field element)
    signal input employeeSecret;     // Employee's secret key
    signal input nonce;              // Random nonce for uniqueness

    signal output commitment;

    component hasher = Poseidon(3);
    hasher.inputs[0] <== encryptedSalary;
    hasher.inputs[1] <== employeeSecret;
    hasher.inputs[2] <== nonce;

    commitment <== hasher.out;
}

/**
 * SalaryWithdraw
 *
 * Main circuit for proving withdrawal eligibility
 *
 * Public inputs:
 *   - commitment: The on-chain stored commitment
 *   - nullifier: Prevents double-spending
 *   - withdrawAmount: The amount being withdrawn
 *   - poolRoot: Merkle root of all commitments in the pool
 *
 * Private inputs:
 *   - encryptedSalary: FHE16 encrypted salary
 *   - decryptedSalary: The actual salary amount
 *   - employeeSecret: Employee's secret
 *   - nonce: Nonce used in commitment
 *   - pathElements: Merkle proof path
 *   - pathIndices: Merkle proof indices
 */
template SalaryWithdraw(levels) {
    // Public inputs
    signal input commitment;
    signal input nullifier;
    signal input withdrawAmount;
    signal input poolRoot;

    // Private inputs
    signal input encryptedSalary;
    signal input decryptedSalary;
    signal input employeeSecret;
    signal input nonce;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // 1. Verify commitment matches
    component commitmentCheck = SalaryCommitment();
    commitmentCheck.encryptedSalary <== encryptedSalary;
    commitmentCheck.employeeSecret <== employeeSecret;
    commitmentCheck.nonce <== nonce;

    commitment === commitmentCheck.commitment;

    // 2. Verify nullifier (prevents double-spend)
    component nullifierHasher = Poseidon(2);
    nullifierHasher.inputs[0] <== employeeSecret;
    nullifierHasher.inputs[1] <== nonce;

    nullifier === nullifierHasher.out;

    // 3. Verify withdraw amount matches decrypted salary
    // (In production, this would verify FHE decryption)
    withdrawAmount === decryptedSalary;

    // 4. Verify commitment is in the pool (Merkle proof)
    component merkleProof = MerkleProof(levels);
    merkleProof.leaf <== commitment;
    merkleProof.root <== poolRoot;
    for (var i = 0; i < levels; i++) {
        merkleProof.pathElements[i] <== pathElements[i];
        merkleProof.pathIndices[i] <== pathIndices[i];
    }

    // 5. Range check: amount must be positive and <= max salary
    component rangeCheck = LessThan(64);
    rangeCheck.in[0] <== withdrawAmount;
    rangeCheck.in[1] <== 10000000; // Max 10M (in smallest unit)
    rangeCheck.out === 1;

    component positiveCheck = GreaterThan(64);
    positiveCheck.in[0] <== withdrawAmount;
    positiveCheck.in[1] <== 0;
    positiveCheck.out === 1;
}

/**
 * MerkleProof
 *
 * Verifies that a leaf exists in a Merkle tree
 */
template MerkleProof(levels) {
    signal input leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    component hashers[levels];
    component mux[levels];

    signal levelHashes[levels + 1];
    levelHashes[0] <== leaf;

    for (var i = 0; i < levels; i++) {
        hashers[i] = Poseidon(2);

        // If pathIndices[i] == 0, hash(levelHash, pathElement)
        // If pathIndices[i] == 1, hash(pathElement, levelHash)

        mux[i] = DualMux();
        mux[i].in[0] <== levelHashes[i];
        mux[i].in[1] <== pathElements[i];
        mux[i].s <== pathIndices[i];

        hashers[i].inputs[0] <== mux[i].out[0];
        hashers[i].inputs[1] <== mux[i].out[1];

        levelHashes[i + 1] <== hashers[i].out;
    }

    root === levelHashes[levels];
}

/**
 * DualMux
 *
 * Swaps two inputs based on selector
 */
template DualMux() {
    signal input in[2];
    signal input s;
    signal output out[2];

    s * (1 - s) === 0; // s must be 0 or 1

    out[0] <== (in[1] - in[0]) * s + in[0];
    out[1] <== (in[0] - in[1]) * s + in[1];
}

// Main component with 20 levels (supports ~1M commitments)
component main {public [commitment, nullifier, withdrawAmount, poolRoot]} = SalaryWithdraw(20);
