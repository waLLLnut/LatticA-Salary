# LatticA Salary - Technical Architecture

## Overview

LatticA Salary implements a **privacy-preserving payroll system** combining:

1. **FHE16** - Fully Homomorphic Encryption for salary data
2. **zkBob** - Zero-knowledge proofs for confidential withdrawals (CC0/MIT)
3. **ConfidentialSalaryPool** - Integration contract for FHE + ZK

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              ADMIN FLOW                                       │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌────────────┐ │
│  │ CSV Upload  │────▶│ FHE16.enc() │────▶│ Commitment  │────▶│  On-chain  │ │
│  │ (salaries)  │     │  (WASM)     │     │ Generation  │     │  Register  │ │
│  └─────────────┘     └─────────────┘     └─────────────┘     └────────────┘ │
│                                                                              │
│  ┌─────────────┐                                              ┌────────────┐ │
│  │ Pool Deposit│─────────────────────────────────────────────▶│ Confidential│ │
│  │ (Total)     │                                              │ SalaryPool │ │
│  └─────────────┘                                              └────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────────────┐
│                             EMPLOYEE FLOW                                     │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌────────────┐ │
│  │ Fetch       │────▶│ FHE16.dec() │────▶│ View Salary │────▶│ ZK Proof   │ │
│  │ Encrypted   │     │  (WASM)     │     │  Details    │     │ Generation │ │
│  └─────────────┘     └─────────────┘     └─────────────┘     └─────┬──────┘ │
│                                                                     │        │
│                                                                     ▼        │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌────────────┐ │
│  │ Receive     │◀────│ Pool.       │◀────│ Verify      │◀────│ Submit     │ │
│  │ Tokens      │     │ withdraw()  │     │ ZK Proof    │     │ to Chain   │ │
│  └─────────────┘     └─────────────┘     └─────────────┘     └────────────┘ │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
```

## Components

### 1. FHE16 Module (Proprietary)

**Location:** `frontend/lib/fhe.ts`, `lib/fhe16/`

```typescript
// Encrypt salary (browser-side, WASM)
const encrypted = await fhe16.encrypt(5000);

// Decrypt (employee only, with secret key)
const decrypted = await fhe16.decrypt(encrypted, secretKey);
```

**Features:**
- 16-bit Fully Homomorphic Encryption
- WASM-based, runs in browser
- Supports arithmetic on encrypted data
- Proprietary waLLLnut technology

### 2. zkBob Privacy Layer (CC0/MIT)

**Location:** `contracts/zkbob/`

**Source:** https://github.com/zkBob/zkbob-contracts

**License:** CC0-1.0 (Public Domain) / MIT (ZeroPool portions)

**Components:**
- `ZkBobPool.sol` - Core privacy pool
- `ITransferVerifier.sol` - ZK proof verification interface
- `ITreeVerifier.sol` - Merkle tree verification
- Supporting utilities

### 3. ConfidentialSalaryPool (BSL-1.1)

**Location:** `contracts/ConfidentialSalaryPool.sol`

**Integration contract combining FHE16 + zkBob:**

```solidity
contract ConfidentialSalaryPool {
    // Admin deposits total payroll
    function deposit(uint256 _amount) external onlyAdmin;

    // Admin registers FHE-encrypted salary commitments
    function registerSalary(bytes32 _commitment, string calldata _encryptedDataCID) external onlyAdmin;

    // Employee withdraws with ZK proof (amount hidden)
    function withdraw(
        uint256[8] calldata _proof,
        uint256[5] calldata _publicSignals,
        address _recipient,
        uint256 _amount
    ) external;
}
```

## Privacy Guarantees

| Data | On-chain Visibility | Technology |
|------|---------------------|------------|
| Total pool deposits | Visible | - |
| Individual salary amounts | Hidden | ZK Proof |
| Salary details (tax, bonus) | Hidden | FHE16 |
| Employee registration | Hidden (commitment only) | Poseidon Hash |
| Withdrawal amounts | Hidden | ZK Proof |
| Recipient addresses | Visible | - |

## Data Flow

### 1. Salary Registration (Admin)

```
1. Admin prepares salary CSV
2. For each employee:
   a. FHE16.encrypt(salary) → encryptedSalary
   b. Generate random nonce
   c. commitment = Poseidon(encryptedSalary, employeeSecret, nonce)
   d. Call pool.registerSalary(commitment, encryptedDataCID)
3. Update Merkle root
4. Deposit total payroll to pool
```

### 2. Salary Withdrawal (Employee)

```
1. Employee fetches their encrypted salary data
2. FHE16.decrypt(encryptedSalary) → viewable salary amount
3. Generate nullifier = Poseidon(employeeSecret, nonce)
4. Generate ZK proof proving:
   - Commitment exists in Merkle tree
   - Employee knows the secret
   - Withdrawal amount matches encrypted salary
5. Call pool.withdraw(proof, publicSignals, recipient, amount)
6. Pool verifies proof and transfers tokens
```

## Third-Party Dependencies

| Component | License | Source |
|-----------|---------|--------|
| zkBob Contracts | CC0-1.0 / MIT | https://github.com/zkBob/zkbob-contracts |
| OpenZeppelin | MIT | https://github.com/OpenZeppelin/openzeppelin-contracts |

See [THIRD_PARTY_LICENSES.md](../THIRD_PARTY_LICENSES.md) for full details.

## Security Considerations

### Double-Spend Prevention
- Nullifiers ensure each salary can only be withdrawn once
- `nullifier = Poseidon(employeeSecret, nonce)`
- Stored on-chain, checked before every withdrawal

### Key Management
- **FHE16 Public Key:** Public, used for encryption
- **FHE16 Secret Key:** Threshold distribution in production
- **Employee Secrets:** Generated locally, never transmitted

### Merkle Root Updates
- Admin must update root after adding commitments
- Root mismatch causes withdrawal failure

## Current Trust Model (Phase 1: Hackathon)

**Trusted Executor Model**

In the current implementation, the Executor bridges FHE16-encrypted data and ZK withdrawals:

```
┌─────────────────────────────────────────────────────────────────┐
│                    Trusted Executor Flow                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. Employee requests withdrawal                                │
│  2. Executor decrypts FHE16 ciphertext → verifies amount       │
│  3. Executor generates ZK proof with verified amount            │
│  4. Executor calls pool.withdraw()                              │
│                                                                 │
│  Trust assumption: Executor is honest                           │
│  Limitation: Executor sees decrypted salary amounts             │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Why this approach for hackathon:**
- Simpler implementation
- Demonstrates end-to-end flow
- ZK circuit for FHE verification is complex

## Roadmap: Trustless FHE + ZK Integration (Phase 2)

The long-term goal is to eliminate the trusted executor entirely:

```
┌─────────────────────────────────────────────────────────────────┐
│              Trustless FHE + ZK Integration                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Admin (at registration):                                       │
│    1. FHE16.encrypt(salary, pk) → ciphertext                   │
│    2. Generate amount_proof:                                    │
│       "This ciphertext encrypts amount X"                       │
│    3. Generate binding_proof:                                   │
│       "This commitment corresponds to this ciphertext"          │
│    4. Register (commitment, ciphertext, proofs) on-chain       │
│                                                                 │
│  Employee (at withdrawal):                                      │
│    1. Generate withdraw_proof locally proving:                  │
│       - "I know the secret for this commitment"                │
│       - "The amount I'm withdrawing matches the commitment"    │
│       - "The commitment is bound to the FHE ciphertext"        │
│    2. Submit proof directly to contract                         │
│    3. No executor involvement                                   │
│                                                                 │
│  Trust: Mathematical proofs only, no trusted third party       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Key innovations needed:**
1. ZK circuit that verifies FHE ciphertext properties
2. Binding proof between commitment and ciphertext
3. Efficient on-chain verification

## Future Improvements

| Phase | Feature | Description |
|-------|---------|-------------|
| **Phase 1** (Current) | Trusted Executor | Executor bridges FHE ↔ ZK |
| **Phase 2** | Trustless FHE+ZK | Proofs bind ciphertext to commitment |
| **Phase 3** | Threshold FHE | Distribute secret key (N-of-M) |
| **Phase 4** | Stealth Addresses | Hide recipient addresses |
| **Phase 5** | Cross-chain | Bridge to other L2s |

---

Built for Mantle Hackathon 2025 by waLLLnut
