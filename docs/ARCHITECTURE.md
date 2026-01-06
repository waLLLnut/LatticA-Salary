# LatticA Salary - Technical Architecture

## Confidential Payroll System with FHE + ZK

### Overview

LatticA Salary implements a **confidential payroll system** that protects both payslip details AND payment amounts using:

1. **FHE16** (Fully Homomorphic Encryption) - Encrypts salary data
2. **ZK Proofs** (Zero-Knowledge) - Enables confidential withdrawals
3. **Merkle Trees** - Efficiently proves membership

### Problem Statement

Traditional blockchain payroll has a critical privacy issue:

```
❌ Current State:
Admin → sends 5,000 USDT → Employee
        ↑
        This amount is PUBLIC on-chain!
```

Even with encrypted payslips, the actual transfer amount is visible.

### Our Solution

```
✅ LatticA Solution:

1. Admin deposits TOTAL amount to Pool (e.g., 50,000 USDT)
   - Only total is visible, not individual salaries

2. Admin registers encrypted salary commitments
   - commitment = Poseidon(FHE16.encrypt(salary), secret, nonce)
   - Only commitment hash stored on-chain

3. Employee generates ZK proof
   - Proves: "I'm entitled to X USDT from this commitment"
   - WITHOUT revealing X to anyone

4. Employee withdraws with ZK proof
   - Contract verifies proof, releases funds
   - Observer only sees: "Someone withdrew from pool"
```

### Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                           ADMIN FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │  CSV Upload  │────▶│  FHE16.enc() │────▶│  Commitment  │        │
│  │  (5000 USDT) │     │  (encrypt)   │     │  Generation  │        │
│  └──────────────┘     └──────────────┘     └──────┬───────┘        │
│                                                    │                │
│                                    ┌───────────────┴────────────┐  │
│                                    ▼                            ▼  │
│                            ┌──────────────┐            ┌───────────┐
│                            │ Off-chain    │            │ On-chain  │
│                            │ Storage      │            │ Merkle    │
│                            │ (encrypted)  │            │ Tree      │
│                            └──────────────┘            └───────────┘
│                                                                     │
│  ┌──────────────┐                              ┌───────────────────┐
│  │ Pool Deposit │─────────────────────────────▶│ ConfidentialPool  │
│  │ 50,000 USDT  │                              │ Contract          │
│  └──────────────┘                              └───────────────────┘
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          EMPLOYEE FLOW                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │ Fetch        │────▶│ FHE16.dec()  │────▶│  See Salary  │        │
│  │ Encrypted    │     │ (decrypt)    │     │  5000 USDT   │        │
│  └──────────────┘     └──────────────┘     └──────┬───────┘        │
│                                                    │                │
│                                                    ▼                │
│                                           ┌──────────────┐          │
│                                           │ ZK Proof Gen │          │
│                                           │ (snarkjs)    │          │
│                                           └──────┬───────┘          │
│                                                  │                  │
│                                                  ▼                  │
│  ┌──────────────┐     ┌──────────────┐     ┌──────────────┐        │
│  │ Receive USDT │◀────│ Pool.withdraw│◀────│ Submit Proof │        │
│  │ 5000 USDT    │     │ (verified)   │     │ + Nullifier  │        │
│  └──────────────┘     └──────────────┘     └──────────────┘        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Components

#### 1. FHE16 Module (`lib/fhe.ts`)

```typescript
// Encrypt salary amount
const encrypted = await fhe16.encrypt(5000);

// Decrypt (employee only)
const decrypted = await fhe16.decrypt(encrypted, secretKey);
```

- 16-bit Fully Homomorphic Encryption
- WASM-based, runs in browser
- Supports arithmetic on encrypted data

#### 2. ZK Circuit (`circuits/salary_withdraw.circom`)

```circom
template SalaryWithdraw(levels) {
    // Public inputs (visible on-chain)
    signal input commitment;      // From Merkle tree
    signal input nullifier;       // Prevents double-spend
    signal input withdrawAmount;  // Amount being withdrawn
    signal input poolRoot;        // Current Merkle root

    // Private inputs (known only to employee)
    signal input encryptedSalary;
    signal input decryptedSalary;
    signal input employeeSecret;
    signal input nonce;
    signal input pathElements[levels];  // Merkle proof
    signal input pathIndices[levels];
}
```

The circuit proves:
1. ✅ Commitment exists in Merkle tree
2. ✅ Nullifier is correctly derived
3. ✅ Withdraw amount matches decrypted salary
4. ✅ Employee knows the secret

#### 3. ConfidentialPool Contract (`contracts/ConfidentialPool.sol`)

```solidity
contract ConfidentialPool {
    // Store commitments in Merkle tree
    mapping(bytes32 => bool) public commitments;

    // Prevent double-spending
    mapping(bytes32 => bool) public nullifiers;

    // Verify ZK proof and withdraw
    function withdraw(
        uint256[8] calldata proof,
        uint256[4] calldata pubSignals,
        address recipient
    ) external {
        // Verify proof
        require(verifier.verifyProof(...), "Invalid proof");

        // Mark nullifier as used
        nullifiers[nullifier] = true;

        // Transfer funds
        usdt.transfer(recipient, amount);
    }
}
```

#### 4. Confidential Salary Manager (`lib/confidential.ts`)

```typescript
// Register salary (Admin)
const encrypted = await confidentialSalary.registerSalary(
    'EMP-001',
    '0x...',
    5000,
    'January 2025'
);

// Generate proof (Employee)
const proof = await confidentialSalary.generateWithdrawProof('0x...');

// Withdraw on-chain
await pool.withdraw(proof.proof, proof.publicSignals, recipient);
```

### Privacy Guarantees

| Data | On-chain Visibility |
|------|---------------------|
| Total pool deposits | ✅ Visible |
| Individual salary amounts | ❌ Hidden |
| Employee addresses (registration) | ❌ Hidden (only commitment) |
| Employee addresses (withdrawal) | ✅ Visible (receiving address) |
| Payslip details | ❌ Hidden (FHE encrypted) |
| Withdrawal amounts | ❌ Hidden (ZK verified) |

### Security Considerations

1. **Double-Spend Prevention**: Nullifiers ensure each salary can only be withdrawn once

2. **Key Management**:
   - FHE public key: Public
   - FHE secret key: Must be securely distributed (threshold FHE in production)
   - Employee secrets: Generated locally, never transmitted

3. **Merkle Root Updates**: Admin must update root after adding commitments

4. **Front-running**: Use commit-reveal or private mempools for production

### Technology Stack

| Component | Technology | License |
|-----------|------------|---------|
| Encryption | FHE16 (WASM) | Proprietary |
| ZK Proofs | snarkjs/circom | GPL-3.0 (demo) |
| Smart Contracts | Solidity | BSL-1.1 |
| Frontend | Next.js 15 | MIT |
| Blockchain | Mantle Sepolia | - |

### Future Improvements

1. **Threshold FHE**: Distribute secret key among multiple parties
2. **arkworks migration**: Replace GPL snarkjs with MIT-licensed ZK library
3. **Recursive proofs**: Batch multiple withdrawals
4. **Stealth addresses**: Hide receiving addresses
5. **Cross-chain**: Bridge to other networks

---

Built for Mantle Hackathon 2025 by waLLLnut
