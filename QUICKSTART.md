# LatticA Salary - Quick Start Guide

Get up and running with the confidential salary payment system in 15 minutes.

## TL;DR

```bash
# 1. Get testnet tokens
# Visit: https://faucet.sepolia.mantle.xyz

# 2. Setup
git clone <repo-url> LatticA-Salary
cd LatticA-Salary
npm install
cp .env.example .env
# Edit .env with your PRIVATE_KEY

# 3. Deploy
npm run compile
npm run test
npm run deploy:mantle-sepolia

# 4. Start frontend
cd frontend
npm install
# Create .env.local with contract addresses
npm run dev

# 5. Open http://localhost:3000
```

## What is LatticA Salary?

A confidential payroll system where:
- Salaries are encrypted using FHE16 (Fully Homomorphic Encryption)
- Computations happen on encrypted data
- Only authorized parties can decrypt
- Everything is on Mantle Sepolia testnet

## Core Features

### For Admins
- Add employees with encrypted base salaries
- Process single or batch payments
- View payment history
- Generate compliance reports

### For Employees
- View encrypted balance (CID)
- Request decryption to see actual amount
- Access payment history
- Download pay stubs

### Privacy Features
- On-chain balances are encrypted
- Observers can't see salary amounts
- FHE allows computation without decryption
- Only you can decrypt your salary

## Project Structure

```
LatticA-Salary/
├── contracts/           # Solidity smart contracts
│   ├── CERC20.sol      # Encrypted ERC20 token
│   └── SalaryPayroll.sol  # Payroll management
├── scripts/            # Deployment & interaction
├── test/               # Contract tests
├── lib/fhe16/          # FHE16 crypto library
├── frontend/           # Next.js web app
└── executor/           # FHE computation service
```

## Key Concepts

### Ciphertext
Encrypted data representing a salary amount. Size: ~133KB.

```javascript
{
  encrypted_data: [1234, 5678, ...],  // 33,296 integers
  scheme: "FHE16_0.0.1v",
  timestamp: 1704067200000
}
```

### CID (Content Identifier)
32-byte hash used to reference ciphertexts on-chain.

```
0x1234abcd... (66 characters)
```

### Roles
- **ADMIN_ROLE**: Manage employees, configure system
- **PAYROLL_MANAGER_ROLE**: Create and process payments
- **COMPLIANCE_ROLE**: Record compliance data
- **Executor**: Perform FHE computations

## Workflow

### 1. Setup Employee

```javascript
// Admin encrypts base salary (e.g., $5000/month)
const ciphertext = await FHE16_WASM.encrypt(5000);
const cid = generateCID(ciphertext);

// Register ciphertext on-chain
await token.registerCiphertext(cid, ciphertext);

// Add employee
await payroll.addEmployee(employeeAddress, cid);
```

### 2. Process Payment

```javascript
// Admin encrypts payment amount
const paymentCt = await FHE16_WASM.encrypt(5000);
const paymentCid = generateCID(paymentCt);
const taxCid = generateCID(taxCt);

// Create payment
await payroll.createPayment(
  employeeAddress,
  paymentCid,
  startTimestamp,
  endTimestamp,
  taxCid,
  "January 2025 Salary"
);
```

### 3. Execute Computation

```javascript
// Executor fetches ciphertexts
const balanceCt = await token.getCiphertext(balanceCid);
const paymentCt = await token.getCiphertext(paymentCid);

// Perform FHE addition
const newBalanceCt = FHE16.add(balanceCt, paymentCt);
const newCid = generateCID(newBalanceCt);

// Update balance
await token.registerCiphertext(newCid, newBalanceCt);
await token.updateBalance(employeeAddress, newCid);
await payroll.processPayment(paymentId, true);
```

### 4. Employee Views Salary

```javascript
// Get encrypted balance
const cid = await token.balanceOf(myAddress);

// Request decryption (requires executor)
const decrypted = await requestDecryption(cid);
console.log("My salary:", decrypted); // 5000
```

## CLI Commands

### Deploy

```bash
# Compile contracts
npm run compile

# Run tests
npm run test

# Deploy to testnet
npm run deploy:mantle-sepolia
```

### Interact

```bash
# Get contract info
npm run interact -- info

# Add employee
npm run interact -- addEmployee 0x1234... 0xabcd...

# Create payment
npm run interact -- createPayment \
  0x1234... \
  0xabcd... \
  1704067200 \
  1706745600 \
  0xef01... \
  "January 2025"

# Get payment history
npm run interact -- getHistory 0x1234... 0 10
```

## Frontend Routes

- `/` - Home page
- `/admin` - Admin dashboard
- `/employee` - Employee portal

## Environment Variables

### Root `.env`

```env
PRIVATE_KEY=your_private_key_without_0x
MANTLE_SEPOLIA_RPC_URL=https://rpc.sepolia.mantle.xyz
```

### Frontend `.env.local`

```env
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_PAYROLL_ADDRESS=0x...
NEXT_PUBLIC_CHAIN_ID=5003
```

## Network Configuration

**Mantle Sepolia Testnet**
- Chain ID: 5003
- RPC: https://rpc.sepolia.mantle.xyz
- Explorer: https://sepolia.mantlescan.xyz
- Faucet: https://faucet.sepolia.mantle.xyz

## Testing

```bash
# Run all tests
npm test

# Run specific test
npx hardhat test test/CERC20.test.js

# Test with gas report
REPORT_GAS=true npm test

# Test coverage
npx hardhat coverage
```

## Common Tasks

### Add Multiple Employees

```javascript
const employees = [
  { address: "0x123...", salary: 5000 },
  { address: "0x456...", salary: 6000 },
  { address: "0x789...", salary: 7000 },
];

for (const emp of employees) {
  const ct = await encrypt(emp.salary);
  const cid = generateCID(ct);
  await token.registerCiphertext(cid, ct);
  await payroll.addEmployee(emp.address, cid);
}
```

### Batch Payment

```javascript
const addresses = ["0x123...", "0x456...", "0x789..."];
const amounts = [5000, 6000, 7000];
const taxes = [500, 600, 700];

// Encrypt all amounts
const amountCids = await Promise.all(
  amounts.map(async amt => {
    const ct = await encrypt(amt);
    const cid = generateCID(ct);
    await token.registerCiphertext(cid, ct);
    return cid;
  })
);

// Similar for taxes
const taxCids = await encryptAndRegister(taxes);

// Create batch
await payroll.createBatchPayment(
  addresses,
  amountCids,
  startTime,
  endTime,
  taxCids,
  "December 2024 Payroll"
);
```

### Check Employee Status

```javascript
const employee = await payroll.getEmployee(address);
console.log({
  active: employee.isActive,
  hireDate: new Date(employee.hireDate * 1000),
  salaryCid: employee.encryptedSalaryCid,
  lastPayment: new Date(employee.lastPaymentTimestamp * 1000),
  totalPayments: employee.totalPayments.toString()
});
```

## Troubleshooting

### Gas too high?
Use `gasPrice: "auto"` in hardhat.config.js

### Contract verification failed?
Run: `npx hardhat verify --network mantleSepolia <address> <args>`

### FHE16 not working?
Make sure you copied FHE16 files:
```bash
cp -r ../LatticA/fhe_executor/FHE16/* ./lib/fhe16/
cp -r ../LatticA/FHE16_WEB_ENC/* ./frontend/public/
```

### Frontend won't connect?
1. Check MetaMask is on Mantle Sepolia (5003)
2. Verify contract addresses in .env.local
3. Clear browser cache

## Next Steps

1. Read [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed setup
2. Review [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system
3. Check [lib/fhe16/README.md](./lib/fhe16/README.md) for FHE details
4. Explore contract source in [contracts/](./contracts/)

## Resources

- Mantle Docs: https://docs.mantle.xyz
- FHE Research: https://github.com/google/fully-homomorphic-encryption
- Hardhat: https://hardhat.org
- Next.js: https://nextjs.org

## Support

- GitHub Issues: <repo-url>/issues
- Documentation: [README.md](./README.md)
- Architecture: [ARCHITECTURE.md](./ARCHITECTURE.md)

---

Happy building! 🚀
