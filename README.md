# LatticA Salary

**Privacy-First Payroll System on Mantle Network using FHE (Fully Homomorphic Encryption)**

> Built for Mantle Hackathon 2025

[![License: BSL 1.1](https://img.shields.io/badge/License-BSL%201.1-blue.svg)](LICENSE)

**Copyright (c) 2025 waLLLnut** | [walllnut@walllnut.com](mailto:walllnut@walllnut.com)

## Overview

LatticA Salary is a **privacy-preserving payroll system** that protects both salary details AND payment amounts using:

1. **FHE16** - Fully Homomorphic Encryption for salary data
2. **zkBob** - Zero-knowledge proofs for confidential withdrawals (CC0/MIT licensed)

### Privacy Guarantees

| Data | Visibility | Technology |
|------|------------|------------|
| Salary details (payslip) | Hidden | FHE16 Encryption |
| Payment amounts | Hidden | ZK Proofs (zkBob) |
| Total pool deposits | Visible | - |
| Recipient addresses | Visible | - |

## Architecture

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

## Key Innovation: Confidential Pool

Traditional blockchain payroll exposes all payment amounts:
```
❌ Company → Alice: 5,000 USDT (PUBLIC!)
❌ Company → Bob: 8,000 USDT (PUBLIC!)
```

LatticA uses a pool-based approach with ZK proofs:
```
✅ Company → Pool: 13,000 USDT (only total visible)
✅ Pool → Alice: ??? (amount hidden by ZK proof)
✅ Pool → Bob: ??? (amount hidden by ZK proof)
```

## Tech Stack

| Component | Technology | License |
|-----------|------------|---------|
| Blockchain | Mantle Sepolia (Chain ID: 5003) | - |
| Token | MockUSDT (ERC20, 6 decimals) | - |
| Encryption | FHE16 (16-bit FHE) | Proprietary |
| ZK Proofs | zkBob (Privacy Pool) | CC0/MIT |
| Frontend | Next.js 15 + React 19 | MIT |
| Smart Contracts | Solidity + Hardhat | - |
| Web3 | ethers.js v6 | MIT |
| FHE Runtime | WebAssembly (WASM) | - |

## Quick Start

### Prerequisites

- Node.js 18+
- MetaMask browser extension
- Test MNT from [Mantle Sepolia Faucet](https://faucet.sepolia.mantle.xyz)

### 1. Clone & Install

```bash
git clone https://github.com/waLLLnut/LatticA-Salary.git
cd LatticA-Salary

# Install root dependencies
npm install

# Install frontend dependencies
cd frontend
npm install
```

### 2. Setup FHE Files

Copy FHE16 WASM files to frontend public folder:

```bash
# From LatticA main project (if you have it)
cp path/to/FHE16_WEB_ENC/fhe16.js frontend/public/
cp path/to/FHE16_WEB_ENC/fhe16.wasm frontend/public/
cp path/to/FHE16_WEB_ENC/pk.bin frontend/public/
```

> Note: FHE files are not included in the repository due to size. Contact maintainer for files.

### 3. Run Development Server

```bash
cd frontend
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Connect Wallet

1. Click "Connect Wallet" button
2. MetaMask will prompt to add Mantle Sepolia network (automatic)
3. Approve connection

## Project Structure

```
LatticA-Salary/
├── frontend/                 # Next.js frontend application
│   ├── app/                  # App router pages
│   │   ├── page.tsx          # Landing page
│   │   ├── admin/page.tsx    # Admin portal
│   │   └── employee/page.tsx # Employee portal
│   ├── lib/                  # Core libraries
│   │   ├── fhe.ts            # FHE16 WASM wrapper
│   │   └── wallet.ts         # MetaMask & contract interaction
│   ├── hooks/                # React hooks
│   │   ├── useWallet.ts      # Wallet state management
│   │   └── useFHE.ts         # FHE encryption hooks
│   └── public/               # Static files (FHE WASM goes here)
│
├── frontend-view/            # Static HTML version (demo)
│   ├── index.html
│   ├── admin.html
│   ├── employee.html
│   └── app.js
│
├── contracts/                # Solidity smart contracts
│   ├── CERC20.sol            # MockUSDT token
│   ├── SalaryPayroll.sol     # Basic payroll contract
│   ├── ConfidentialSalaryPool.sol # FHE+ZK integrated pool
│   ├── zkbob/                # zkBob contracts (CC0/MIT)
│   ├── interfaces/           # Contract interfaces
│   ├── libraries/            # Utility libraries
│   └── proxy/                # Proxy contracts
│
├── lib/                      # FHE16 Node.js library
│   └── fhe16/
│       ├── fhe16.js
│       └── fhe16.d.ts
│
├── executor/                 # FHE computation executor
│   └── FHE16/
│
├── scripts/                  # Deployment scripts
│   └── deploy.mjs
│
└── test/                     # Contract tests
```

## Smart Contract Deployment

### Deploy to Mantle Sepolia

```bash
# Set environment variables
cp .env.example .env
# Edit .env with your private key

# Deploy contracts
npx hardhat run scripts/deploy.mjs --network mantleSepolia
```

### Update Contract Addresses

After deployment, update addresses in `frontend/lib/wallet.ts`:

```typescript
export const CONTRACTS = {
  MOCK_USDT: '0x...',  // Your deployed MockUSDT address
  PAYROLL: '0x...',    // Your deployed SalaryPayroll address
};
```

## Usage Guide

### Admin Flow

1. **Connect Wallet** - Connect with admin wallet
2. **Upload CSV** - Upload payroll data (address, amount, memo)
3. **Create Batch** - Encrypt payslips with FHE16, create payment batch
4. **Execute** - Approve and execute USDT batch transfer

### Employee Flow

1. **Connect Wallet** - Connect with registered employee wallet
2. **View Balance** - See USDT balance (public)
3. **Decrypt Payslip** - Decrypt your encrypted payslip (private)
4. **Download PDF** - Download signed payslip document

## Network Configuration

| Parameter | Value |
|-----------|-------|
| Network Name | Mantle Sepolia |
| Chain ID | 5003 |
| RPC URL | https://rpc.sepolia.mantle.xyz |
| Explorer | https://sepolia.mantlescan.xyz |
| Currency | MNT |

## Security Considerations

1. **Key Management** - FHE secret keys must be stored securely
2. **CID Integrity** - Always verify CID matches ciphertext hash
3. **On-chain Privacy** - USDT amounts are public; only payslip details are encrypted
4. **Threshold FHE** - Future: Distribute global secret key among multiple parties

## Development

### Run Tests

```bash
npx hardhat test
```

### Build Frontend

```bash
cd frontend
npm run build
```

### Lint

```bash
cd frontend
npm run lint
```

## API Reference

### FHE Module (`frontend/lib/fhe.ts`)

```typescript
import { fhe16, encryptPayslip, generateCID } from '@/lib/fhe';

// Initialize
await fhe16.init();
await fhe16.loadPublicKey();

// Encrypt salary
const encrypted = await fhe16.encrypt(5000);

// Encrypt payslip
const payslip = await encryptPayslip({
  baseSalary: 5000,
  tax: 165,
  otherDeductions: 0,
  netAmount: 4835,
  period: 'January 2025',
  employeeId: 'EMP-001',
});
```

### Wallet Module (`frontend/lib/wallet.ts`)

```typescript
import { connectWallet, getUSDTBalance, registerEmployee } from '@/lib/wallet';

// Connect
await connectWallet();

// Get balance
const balance = await getUSDTBalance();

// Register employee (admin only)
await registerEmployee('EMP-001', '0x...', commitment);
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

**Business Source License 1.1 (BSL 1.1)**

| Parameter | Value |
|-----------|-------|
| Licensor | waLLLnut |
| Change Date | 2030-01-01 |
| Change License | Apache License 2.0 |

### Permitted Use

**Non-production use** is always permitted:
- Development, testing, research
- Academic and educational purposes

**Production use** is permitted only for:
- Deployment on public blockchain testnets (e.g., Mantle Sepolia, Goerli)
- Academic or research purposes on any network

### What Requires a Commercial License

| Use Case | License Required? |
|----------|-------------------|
| Local development | No |
| Testnet deployment | No |
| Academic research on mainnet | No |
| Commercial mainnet deployment | **Yes** |
| Revenue-generating dApp | **Yes** |
| Enterprise internal use | **Yes** |

**After 2030-01-01:** This software becomes Apache 2.0 licensed (full open source).

For commercial licensing, contact: [walllnut@walllnut.com](mailto:walllnut@walllnut.com)

See [LICENSE](LICENSE) for full terms. Change License text: [Apache-2.0](licenses/Apache-2.0.txt)

## Contact

- **Organization**: waLLLnut
- **Author**: Seunghwan Lee
- **Email**: [shlee@walllnut.com](mailto:shlee@walllnut.com)
- **General Inquiries**: [walllnut@walllnut.com](mailto:walllnut@walllnut.com)
- **GitHub**: [@waLLLnut](https://github.com/waLLLnut)

---

Built with privacy in mind for Mantle Hackathon 2025

## Third-Party Licenses

This project uses the following open-source components:

| Component | License | Source |
|-----------|---------|--------|
| zkBob Contracts | CC0-1.0 / MIT | [github.com/zkBob/zkbob-contracts](https://github.com/zkBob/zkbob-contracts) |
| OpenZeppelin | MIT | [github.com/OpenZeppelin/openzeppelin-contracts](https://github.com/OpenZeppelin/openzeppelin-contracts) |

See [THIRD_PARTY_LICENSES.md](THIRD_PARTY_LICENSES.md) for full details.

---

Copyright (c) 2025 waLLLnut. All rights reserved.
