# LatticA Salary Deployment Guide

Complete step-by-step guide to deploy and run the confidential salary payment system on Mantle Sepolia testnet.

## Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Git
- MetaMask or compatible Web3 wallet
- Basic knowledge of Ethereum and smart contracts

## Step 1: Get Testnet Tokens

Before deploying, you need MNT tokens on Mantle Sepolia testnet:

### Option 1: Mantle Sepolia Faucet
1. Visit https://faucet.sepolia.mantle.xyz
2. Connect your wallet
3. Request testnet tokens (you'll receive 0.5 MNT)

### Option 2: HackQuest Faucet
1. Visit https://www.hackquest.io/en/faucets
2. Select Mantle Sepolia
3. Enter your address and request tokens

**Verify you have tokens:**
```bash
# Check balance in MetaMask or use:
npx hardhat run scripts/check-balance.js --network mantleSepolia
```

## Step 2: Clone and Setup

```bash
# Clone the repository
cd ~/Dropbox/Developes
git clone <your-repo-url> LatticA-Salary
cd LatticA-Salary

# Install dependencies
npm install

# Verify installation
npx hardhat --version
```

## Step 3: Configure Environment

Create `.env` file from the template:

```bash
cp .env.example .env
```

Edit `.env` with your configuration:

```env
# Your private key (WITHOUT 0x prefix)
# WARNING: Never commit this file or share your private key!
PRIVATE_KEY=your_private_key_here

# Mantle Sepolia RPC
MANTLE_SEPOLIA_RPC_URL=https://rpc.sepolia.mantle.xyz

# Optional: Custom RPC endpoint
# MANTLE_SEPOLIA_RPC_URL=https://mantle-sepolia.drpc.org
```

**To get your private key from MetaMask:**
1. Open MetaMask
2. Click the three dots menu
3. Account Details > Show Private Key
4. Enter password and copy the key
5. Paste in `.env` (without 0x prefix)

## Step 4: Compile Contracts

```bash
# Compile Solidity contracts
npm run compile

# Expected output:
# Compiled 2 Solidity files successfully
```

This creates:
- `artifacts/` - Compiled contract artifacts
- `cache/` - Hardhat cache
- `typechain-types/` - TypeScript type definitions

## Step 5: Run Tests (Optional but Recommended)

```bash
# Run all tests
npm run test

# Expected: All tests should pass
# ✓ CERC20 (XX tests)
# ✓ SalaryPayroll (XX tests)
```

## Step 6: Deploy to Mantle Sepolia

```bash
# Deploy contracts
npm run deploy:mantle-sepolia
```

**Expected output:**
```
🚀 Deploying LatticA Salary Contracts to Mantle Sepolia...

📍 Deploying contracts with account: 0x1234...
💰 Account balance: 0.5 MNT

📄 Deploying CERC20 Token Contract...
✅ CERC20 Token deployed to: 0xabcd1234...
   Name: Confidential Salary Token
   Symbol: cSAL
   Decimals: 18

📄 Deploying SalaryPayroll Contract...
✅ SalaryPayroll deployed to: 0xef567890...

⚙️  Configuring roles...
✅ Roles configured

📝 Deployment info saved to: mantleSepolia-1704067200000.json
📝 Latest deployment: mantleSepolia-latest.json

====================================================================
🎉 DEPLOYMENT SUCCESSFUL!
====================================================================

📋 Contract Addresses:
   CERC20 Token:     0xabcd1234...
   SalaryPayroll:    0xef567890...

🔗 Explorer Links:
   CERC20:    https://sepolia.mantlescan.xyz/address/0xabcd1234...
   Payroll:   https://sepolia.mantlescan.xyz/address/0xef567890...
```

**Save these addresses!** You'll need them for the frontend configuration.

## Step 7: Verify Contracts on Explorer (Optional)

Verification makes your code readable on the block explorer:

```bash
# Verify CERC20
npx hardhat verify --network mantleSepolia \
  <CERC20_ADDRESS> \
  "Confidential Salary Token" \
  "cSAL" \
  <YOUR_ADDRESS>

# Verify SalaryPayroll
npx hardhat verify --network mantleSepolia \
  <PAYROLL_ADDRESS> \
  <CERC20_ADDRESS> \
  <YOUR_ADDRESS>
```

## Step 8: Setup FHE16 Library

Copy FHE16 files from the main LatticA project:

```bash
# Copy FHE16 native library
cp -r ../LatticA/fhe_executor/FHE16/lib ./lib/fhe16/
cp ../LatticA/fhe_executor/FHE16/bootparam.bin ./lib/fhe16/
cp ../LatticA/fhe_executor/FHE16/index.js ./lib/fhe16/fhe16.js

# Copy WASM files for frontend
cp ../LatticA/FHE16_WEB_ENC/fhe16.js ./frontend/public/
cp ../LatticA/FHE16_WEB_ENC/fhe16.wasm ./frontend/public/
cp ../LatticA/FHE16_WEB_ENC/pk.bin ./frontend/public/
```

If you don't have the LatticA project, download the FHE16 binaries separately.

## Step 9: Configure Frontend

```bash
cd frontend

# Create .env.local
cat > .env.local << EOF
NEXT_PUBLIC_CONTRACT_ADDRESS=<CERC20_ADDRESS>
NEXT_PUBLIC_PAYROLL_ADDRESS=<PAYROLL_ADDRESS>
NEXT_PUBLIC_CHAIN_ID=5003
EOF

# Install frontend dependencies
npm install
```

## Step 10: Start Frontend

```bash
# Development mode
npm run dev

# Production build
npm run build
npm run start
```

Visit http://localhost:3000 to see the application.

## Step 11: Connect Wallet

1. Open the frontend in your browser
2. Click "Connect Wallet"
3. Approve the connection in MetaMask
4. Make sure you're on Mantle Sepolia network (Chain ID: 5003)

**Add Mantle Sepolia to MetaMask:**
- Network Name: Mantle Sepolia
- RPC URL: https://rpc.sepolia.mantle.xyz
- Chain ID: 5003
- Currency Symbol: MNT
- Block Explorer: https://sepolia.mantlescan.xyz

## Step 12: Test the System

### As Admin:

1. Go to Admin Portal
2. Add an employee:
   ```
   Address: <employee_wallet_address>
   Encrypted Salary CID: 0x1234... (generate using FHE16)
   ```

3. Create a payment:
   ```
   Employee: <address>
   Amount CID: 0xabcd...
   Pay Period: Start and end timestamps
   Tax CID: 0xef01...
   Memo: "January 2025 Salary"
   ```

### As Employee:

1. Go to Employee Portal
2. View your encrypted balance
3. Request decryption (requires executor)
4. View payment history

## Step 13: Setup FHE Executor (Optional)

For full functionality, run the FHE executor:

```bash
cd executor

# Copy executor code from LatticA
cp -r ../../LatticA/fhe_executor/* ./

# Install dependencies
npm install

# Configure executor
cat > .env << EOF
EXECUTOR_PORT=3001
CONTRACTS_ADDRESS=<PAYROLL_ADDRESS>
PRIVATE_KEY=<EXECUTOR_PRIVATE_KEY>
EOF

# Start executor
npm start
```

The executor will:
- Poll for pending jobs
- Perform FHE computations on encrypted data
- Submit results back to the blockchain

## Troubleshooting

### "Insufficient funds" error
- Make sure you have enough MNT tokens from the faucet
- Each transaction costs ~0.001-0.01 MNT

### "Network mismatch" error
- Check that MetaMask is connected to Mantle Sepolia (Chain ID: 5003)
- Verify RPC URL in hardhat.config.js matches

### "Contract not found" error
- Verify deployment was successful
- Check contract addresses in frontend .env.local
- Ensure you're on the correct network

### "Transaction reverted" error
- Check that you have the required role (ADMIN_ROLE, PAYROLL_MANAGER_ROLE)
- Verify that ciphertexts are registered before use
- Check console for detailed error messages

### "FHE16 module not found"
- Make sure you copied all FHE16 files correctly
- Check that paths in import statements are correct
- Verify WASM files are in frontend/public/

## Next Steps

1. **Add more employees**: Use the admin dashboard
2. **Process payroll**: Create batch payments
3. **Monitor transactions**: Check Mantle Sepolia explorer
4. **Integrate executor**: For automated FHE computations
5. **Customize frontend**: Modify components to match your needs

## Production Deployment

For mainnet deployment:

1. **Security audit**: Have contracts audited by professionals
2. **Update network**: Change to Mantle mainnet in hardhat.config.js
3. **Secure keys**: Use hardware wallet or key management service
4. **Setup monitoring**: Track contract events and executor health
5. **Backup data**: Regular backups of deployment info and keys

## Support

For issues or questions:
- Check the README.md
- Review contract documentation in contracts/
- See FHE16 library docs in lib/fhe16/README.md
- Open an issue on GitHub

## Security Notes

- **Never commit `.env` files**
- **Keep private keys secure**
- **Use separate accounts for testing and production**
- **Verify contract addresses before interacting**
- **Test thoroughly on testnet before mainnet**

---

**Congratulations!** You've successfully deployed LatticA Salary system.
