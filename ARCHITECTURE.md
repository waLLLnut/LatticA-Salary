# LatticA Salary - System Architecture

## Overview

LatticA Salary is a confidential payroll system that uses Fully Homomorphic Encryption (FHE16) to keep salary information encrypted both on-chain and during computation. This ensures that salary data remains private while still allowing for automated payroll processing and compliance reporting.

## Architecture Diagram

```
┌──────────────────────────────────────────────────────────────┐
│                      Client Layer                              │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌─────────────────┐              ┌─────────────────┐        │
│  │  Admin Portal   │              │ Employee Portal │        │
│  │  (Next.js)      │              │  (Next.js)      │        │
│  │                 │              │                 │        │
│  │  - Add employees│              │  - View balance │        │
│  │  - Process      │              │  - Decrypt      │        │
│  │    payroll      │              │    salary       │        │
│  │  - Reports      │              │  - History      │        │
│  └────────┬────────┘              └────────┬────────┘        │
│           │                                │                  │
│           └────────────┬───────────────────┘                  │
│                        │                                      │
│                        ▼                                      │
│              ┌──────────────────┐                            │
│              │  FHE16 WASM      │                            │
│              │  Encryption      │                            │
│              │  (Client-side)   │                            │
│              └──────────────────┘                            │
└────────────────────────┬─────────────────────────────────────┘
                         │
                         │ Encrypted Data (CID + Ciphertext)
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   Blockchain Layer                            │
│                  (Mantle Sepolia)                             │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌────────────────────────────────────────────────────────┐  │
│  │              Smart Contracts                            │  │
│  │                                                          │  │
│  │  ┌──────────────────┐       ┌──────────────────┐      │  │
│  │  │  CERC20.sol      │       │ SalaryPayroll.sol│      │  │
│  │  │                  │       │                  │      │  │
│  │  │  - Encrypted     │◄──────┤  - Employee mgmt │      │  │
│  │  │    balances      │       │  - Payment queue │      │  │
│  │  │  - CID registry  │       │  - History       │      │  │
│  │  │  - Transfer      │       │  - Compliance    │      │  │
│  │  └──────────────────┘       └──────────────────┘      │  │
│  │                                                          │  │
│  └──────────────────────────────────────────────────────────┘  │
│                                                                │
│  Events:                                                       │
│  - CiphertextRegistered(cid, registrar)                       │
│  - PaymentCreated(paymentId, employee, amountCid, ...)       │
│  - BalanceUpdated(account, oldCid, newCid)                   │
│                                                                │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         │ Event Polling
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                  Computation Layer                            │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────────────────────────────────────────┐    │
│  │              FHE16 Executor                           │    │
│  │              (Node.js)                                │    │
│  │                                                        │    │
│  │  1. Poll blockchain for payment jobs                  │    │
│  │  2. Fetch encrypted ciphertexts                       │    │
│  │  3. Perform FHE operations:                           │    │
│  │     - balance = balance + salary                      │    │
│  │     - tax_total = tax_total + tax                     │    │
│  │     - payment_count++                                 │    │
│  │  4. Submit encrypted results back                     │    │
│  │                                                        │    │
│  │  FHE Operations:                                       │    │
│  │  ┌────────────────────────────────────────┐          │    │
│  │  │ add, sub, smull, ge, lt, select, ...  │          │    │
│  │  └────────────────────────────────────────┘          │    │
│  │                                                        │    │
│  └──────────────────────────────────────────────────────┘    │
│                                                                │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         │ Updated Ciphertexts
                         │
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                  Storage Layer                                │
├──────────────────────────────────────────────────────────────┤
│                                                                │
│  ┌──────────────────┐              ┌──────────────────┐      │
│  │  On-Chain        │              │  Off-Chain       │      │
│  │                  │              │                  │      │
│  │  - CID → CT map  │              │  - Ciphertext    │      │
│  │  - Balances (CID)│              │    storage       │      │
│  │  - Payments      │              │  - Keys          │      │
│  │  - Employee data │              │  - Metadata      │      │
│  └──────────────────┘              └──────────────────┘      │
│                                                                │
└──────────────────────────────────────────────────────────────┘
```

## Component Details

### 1. Client Layer

#### Admin Portal (`frontend/app/admin/`)
- **Purpose**: Payroll management interface for HR/Finance
- **Features**:
  - Add/remove employees
  - Set encrypted base salaries
  - Create individual or batch payments
  - View payment history and reports
  - Export compliance data
- **Technology**: Next.js 15, React 19, TailwindCSS

#### Employee Portal (`frontend/app/employee/`)
- **Purpose**: Self-service portal for employees
- **Features**:
  - View encrypted balance
  - Request salary decryption
  - View payment history
  - Download pay stubs
  - Tax information
- **Technology**: Next.js 15, React 19, TailwindCSS

#### FHE16 WASM (`frontend/public/fhe16.wasm`)
- **Purpose**: Client-side encryption
- **Operations**:
  - Encrypt salary amounts before submission
  - Use public key for encryption
  - Generate 33296-integer ciphertexts
  - No decryption capability (public key only)
- **Performance**: ~50ms per encryption

### 2. Blockchain Layer

#### CERC20 Token Contract (`contracts/CERC20.sol`)

**Purpose**: ERC20-like token with encrypted balances

**Key Features**:
```solidity
// Storage
mapping(address => bytes32) encryptedBalances;  // address → CID
mapping(bytes32 => Ciphertext) ciphertexts;      // CID → encrypted data

struct Ciphertext {
    bytes encryptedData;  // FHE16 ciphertext (133KB)
    uint256 timestamp;
    bool exists;
}
```

**Core Functions**:
- `registerCiphertext(cid, data)`: Store encrypted data
- `balanceOf(address)`: Get balance CID
- `updateBalance(address, newCid)`: Update after computation (executor only)
- `transfer(to, amountCid)`: Emit transfer event
- `mint(to, amountCid)`: Create new tokens (owner only)

**Access Control**:
- Owner: Can mint/burn, set executor
- Executor: Can update balances after computation
- Anyone: Can register ciphertexts, call transfer

#### SalaryPayroll Contract (`contracts/SalaryPayroll.sol`)

**Purpose**: Payroll management and payment processing

**Key Features**:
```solidity
// Employee management
struct Employee {
    bool isActive;
    uint256 hireDate;
    bytes32 encryptedSalaryCid;  // Base salary
    uint256 lastPaymentTimestamp;
    uint256 totalPayments;
}

// Payment tracking
struct Payment {
    address employee;
    bytes32 encryptedAmountCid;  // Payment amount
    uint256 timestamp;
    uint256 payPeriodStart;
    uint256 payPeriodEnd;
    bytes32 taxAmountCid;        // Tax amount
    PaymentStatus status;        // Pending/Processed/Failed
    string memo;
}

// Batch processing
struct BatchPayment {
    uint256[] paymentIds;
    uint256 timestamp;
    address initiatedBy;
    uint256 successCount;
    uint256 failureCount;
}
```

**Core Functions**:
- `addEmployee(address, salaryCid)`: Register new employee
- `createPayment(...)`: Create single payment
- `createBatchPayment(...)`: Create multiple payments at once
- `processPayment(paymentId, success)`: Mark payment as processed (executor)
- `getPaymentHistory(employee, offset, limit)`: Paginated history
- `recordCompliance(paymentId, ...)`: Store compliance data

**Access Control** (OpenZeppelin AccessControl):
- `ADMIN_ROLE`: Employee management, executor config
- `PAYROLL_MANAGER_ROLE`: Create payments, process payroll
- `COMPLIANCE_ROLE`: Record compliance data

### 3. Computation Layer

#### FHE16 Executor (`executor/`)

**Purpose**: Off-chain computation on encrypted data

**Workflow**:

1. **Job Polling**:
```javascript
// Poll blockchain for PaymentCreated events
const events = await payroll.queryFilter(
  payroll.filters.PaymentCreated()
);

// Filter pending payments
const pendingJobs = events.filter(
  e => payments[e.args.paymentId].status === Pending
);
```

2. **Fetch Ciphertexts**:
```javascript
// Get employee's current balance
const balanceCid = await token.balanceOf(employee);
const balanceCt = await token.getCiphertext(balanceCid);

// Get payment amount
const amountCid = payment.encryptedAmountCid;
const amountCt = await token.getCiphertext(amountCid);
```

3. **FHE Computation**:
```javascript
const FHE16 = require('./fhe16');

// Deserialize ciphertexts
const ct_balance = FHE16.lweFromBytes(balanceCt.encryptedData);
const ct_amount = FHE16.lweFromBytes(amountCt.encryptedData);

// Perform addition (encrypted)
const ct_new_balance = FHE16.add(ct_balance, ct_amount);

// Serialize result
const newBalanceBytes = FHE16.lweToBytes(ct_new_balance);
const newBalanceCid = generateCID({ encrypted_data: newBalanceBytes });
```

4. **Submit Results**:
```javascript
// Register new ciphertext
await token.registerCiphertext(newBalanceCid, newBalanceBytes);

// Update balance
await token.updateBalance(employee, newBalanceCid);

// Mark payment as processed
await payroll.processPayment(paymentId, true);
```

**Supported FHE Operations**:
- **Arithmetic**: add, sub, smull, addConst, smullConst
- **Comparison**: lt, le, gt, ge, eq, neq
- **Logic**: and, or, xor, select
- **Utility**: max, min, abs, neg

**Performance**:
- Addition: ~20ms
- Multiplication: ~100ms
- Comparison: ~150ms

### 4. Storage Layer

#### On-Chain Storage

Stored directly in smart contracts on Mantle Sepolia:

**CERC20**:
```solidity
// CID to ciphertext mapping
mapping(bytes32 => Ciphertext) public ciphertexts;

// Address to balance CID
mapping(address => bytes32) private encryptedBalances;
```

**SalaryPayroll**:
```solidity
// Employee records
mapping(address => Employee) public employees;

// Payment records
mapping(uint256 => Payment) public payments;

// Batch payment records
mapping(uint256 => BatchPayment) public batchPayments;

// Compliance records
mapping(uint256 => ComplianceRecord) public complianceRecords;
```

**Storage Costs** (approximate):
- Register ciphertext: ~500,000 gas (~0.005 MNT)
- Create payment: ~200,000 gas (~0.002 MNT)
- Update balance: ~50,000 gas (~0.0005 MNT)

#### Off-Chain Storage

Optional storage for frequently accessed data:

**Executor Local Storage**:
- Cached ciphertexts
- Secret keys (for decryption requests)
- Boot parameters
- Operation registry

**Frontend Local Storage**:
- User preferences
- Recently viewed payments
- Cached employee list

## Data Flow

### Payment Processing Flow

```
1. Admin creates payment
   ├─> Frontend: Encrypt salary amount with FHE16 WASM
   ├─> Register ciphertext on CERC20
   ├─> Call SalaryPayroll.createPayment()
   └─> Emit PaymentCreated event

2. Executor detects event
   ├─> Fetch employee balance CID
   ├─> Fetch payment amount CID
   ├─> Load ciphertexts from CERC20
   └─> Perform FHE addition: balance = balance + amount

3. Executor submits result
   ├─> Register new balance ciphertext
   ├─> Update employee balance CID
   ├─> Mark payment as processed
   └─> Emit BalanceUpdated event

4. Employee views payment
   ├─> Query payment history
   ├─> Fetch balance CID
   └─> Request decryption (optional)
```

### Decryption Flow

```
1. Employee requests decryption
   ├─> Frontend: Call decrypt API
   └─> Send balance CID + signature

2. Executor validates request
   ├─> Verify employee owns the balance
   ├─> Check access policy
   └─> Load ciphertext from CERC20

3. Executor decrypts
   ├─> FHE16.decInt(ciphertext, secretKey)
   └─> Return plaintext amount

4. Frontend displays result
   ├─> Show decrypted salary
   └─> Update UI
```

## Security Model

### Threat Model

**Protected Against**:
- Blockchain observers seeing salary amounts
- Other employees viewing salaries
- Admin viewing individual salaries (without decryption key)
- MEV bots extracting salary information
- On-chain analysis revealing compensation

**Trust Assumptions**:
- Executor operator is trusted (has secret key)
- Smart contracts are correctly implemented
- FHE16 library is secure
- Client-side WASM is not tampered with
- Private keys are securely stored

### Access Control Matrix

| Role | Add Employee | Create Payment | Process Payment | View Encrypted | Decrypt |
|------|-------------|----------------|-----------------|----------------|---------|
| Admin | ✓ | ✗ | ✗ | ✓ | ✗ |
| Payroll Manager | ✗ | ✓ | ✗ | ✓ | ✗ |
| Compliance | ✗ | ✗ | ✗ | ✓ | ✗ |
| Executor | ✗ | ✗ | ✓ | ✓ | ✓ |
| Employee | ✗ | ✗ | ✗ | ✓ (own) | ✓ (own) |

### Encryption Properties

**FHE16 Characteristics**:
- **Ciphertext Size**: 133,184 bytes (33,296 × 4 bytes)
- **Security Level**: ~100 bits
- **Plaintext Range**: 32-bit signed integers (-2^31 to 2^31-1)
- **Noise Growth**: Manageable for ~10 operations
- **Bootstrapping**: Required for deep circuits

**CID (Content Identifier)**:
- **Format**: SHA256 hash (32 bytes)
- **Purpose**: Unique identifier for ciphertexts
- **Collision Resistance**: 2^256 (effectively impossible)
- **Integrity**: Any tampering changes CID

## Scalability Considerations

### Current Limitations

- **On-Chain Storage**: ~130KB per ciphertext
- **Gas Costs**: ~500K gas to register ciphertext
- **Computation Speed**: ~20-150ms per FHE operation
- **Executor Bottleneck**: Sequential processing

### Optimization Strategies

1. **Batch Processing**:
   - Process multiple payments in one transaction
   - Amortize gas costs

2. **Off-Chain Storage**:
   - Store ciphertexts in IPFS/Arweave
   - Only store CIDs on-chain

3. **Parallel Execution**:
   - Multiple executor instances
   - Independent payment processing

4. **State Channels**:
   - Off-chain payment aggregation
   - Periodic on-chain settlement

### Estimated Throughput

- **Payments per batch**: 10-100
- **Processing time**: 1-10 seconds
- **Gas cost per payment**: ~50,000 gas
- **Monthly capacity**: ~10,000 payments (single executor)

## Future Enhancements

### Short-Term (1-3 months)
- [ ] Multi-executor support
- [ ] IPFS integration for ciphertext storage
- [ ] Advanced reporting dashboard
- [ ] Mobile app support

### Medium-Term (3-6 months)
- [ ] Cross-chain payment support
- [ ] Automated tax calculations
- [ ] Integration with payroll APIs
- [ ] Decentralized executor network

### Long-Term (6-12 months)
- [ ] zkSNARK proofs for computation
- [ ] Threshold decryption (multi-party)
- [ ] Compliance automation (W-2, 1099)
- [ ] Mainnet deployment

## References

- [FHE16 Specification](https://github.com/...)
- [Mantle Network Docs](https://docs.mantle.xyz)
- [OpenZeppelin Contracts](https://docs.openzeppelin.com/contracts)
- [Hardhat Documentation](https://hardhat.org/docs)

---

For implementation details, see individual component documentation in their respective directories.
