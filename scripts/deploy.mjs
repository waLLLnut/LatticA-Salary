const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  console.log("🚀 Deploying LatticA Salary Contracts to Mantle Sepolia...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("📍 Deploying contracts with account:", deployer.address);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "MNT\n");

  if (balance === 0n) {
    console.error("❌ Error: Account has no balance!");
    console.log("Please get testnet tokens from:");
    console.log("  - Mantle Sepolia Faucet: https://faucet.sepolia.mantle.xyz");
    console.log("  - HackQuest Faucet: https://www.hackquest.io/en/faucets\n");
    process.exit(1);
  }

  // Step 1: Deploy CERC20 Token
  console.log("📄 Deploying CERC20 Token Contract...");
  const CERC20 = await hre.ethers.getContractFactory("CERC20");

  // For now, use deployer as executor (will be updated later)
  const token = await CERC20.deploy(
    "Confidential Salary Token",
    "cSAL",
    deployer.address
  );

  await token.waitForDeployment();
  const tokenAddress = await token.getAddress();
  console.log("✅ CERC20 Token deployed to:", tokenAddress);
  console.log("   Name:", await token.name());
  console.log("   Symbol:", await token.symbol());
  console.log("   Decimals:", await token.decimals(), "\n");

  // Step 2: Deploy SalaryPayroll Contract
  console.log("📄 Deploying SalaryPayroll Contract...");
  const SalaryPayroll = await hre.ethers.getContractFactory("SalaryPayroll");

  const payroll = await SalaryPayroll.deploy(
    tokenAddress,
    deployer.address // executor
  );

  await payroll.waitForDeployment();
  const payrollAddress = await payroll.getAddress();
  console.log("✅ SalaryPayroll deployed to:", payrollAddress, "\n");

  // Step 3: Configure roles
  console.log("⚙️  Configuring roles...");

  const ADMIN_ROLE = await payroll.ADMIN_ROLE();
  const PAYROLL_MANAGER_ROLE = await payroll.PAYROLL_MANAGER_ROLE();
  const COMPLIANCE_ROLE = await payroll.COMPLIANCE_ROLE();

  console.log("   Admin role:", await payroll.hasRole(ADMIN_ROLE, deployer.address));
  console.log("   Payroll Manager role:", await payroll.hasRole(PAYROLL_MANAGER_ROLE, deployer.address));
  console.log("✅ Roles configured\n");

  // Step 4: Save deployment info
  const deploymentInfo = {
    network: hre.network.name,
    chainId: (await hre.ethers.provider.getNetwork()).chainId.toString(),
    deployer: deployer.address,
    timestamp: new Date().toISOString(),
    contracts: {
      CERC20: {
        address: tokenAddress,
        name: "Confidential Salary Token",
        symbol: "cSAL",
        decimals: 18
      },
      SalaryPayroll: {
        address: payrollAddress,
        token: tokenAddress
      }
    },
    roles: {
      ADMIN_ROLE: ADMIN_ROLE,
      PAYROLL_MANAGER_ROLE: PAYROLL_MANAGER_ROLE,
      COMPLIANCE_ROLE: COMPLIANCE_ROLE
    }
  };

  const deploymentPath = path.join(__dirname, "..", "deployments");
  if (!fs.existsSync(deploymentPath)) {
    fs.mkdirSync(deploymentPath, { recursive: true });
  }

  const filename = `${hre.network.name}-${Date.now()}.json`;
  const filepath = path.join(deploymentPath, filename);
  fs.writeFileSync(filepath, JSON.stringify(deploymentInfo, null, 2));

  // Also save as latest
  const latestPath = path.join(deploymentPath, `${hre.network.name}-latest.json`);
  fs.writeFileSync(latestPath, JSON.stringify(deploymentInfo, null, 2));

  console.log("📝 Deployment info saved to:", filename);
  console.log("📝 Latest deployment:", `${hre.network.name}-latest.json\n`);

  // Step 5: Display summary
  console.log("=" .repeat(60));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=" .repeat(60));
  console.log("\n📋 Contract Addresses:");
  console.log("   CERC20 Token:    ", tokenAddress);
  console.log("   SalaryPayroll:   ", payrollAddress);
  console.log("\n🔗 Explorer Links:");
  console.log("   CERC20:    ", `https://sepolia.mantlescan.xyz/address/${tokenAddress}`);
  console.log("   Payroll:   ", `https://sepolia.mantlescan.xyz/address/${payrollAddress}`);
  console.log("\n⚡ Next Steps:");
  console.log("   1. Update .env with contract addresses");
  console.log("   2. Set up FHE executor and update executor addresses");
  console.log("   3. Grant additional roles if needed");
  console.log("   4. Start the frontend application");
  console.log("=" .repeat(60) + "\n");

  // Step 6: Verify contracts (optional)
  if (hre.network.name === "mantleSepolia") {
    console.log("⏳ Waiting 30 seconds before verification...");
    await new Promise(resolve => setTimeout(resolve, 30000));

    try {
      console.log("\n🔍 Verifying CERC20 Token...");
      await hre.run("verify:verify", {
        address: tokenAddress,
        constructorArguments: [
          "Confidential Salary Token",
          "cSAL",
          deployer.address
        ],
      });
      console.log("✅ CERC20 verified");

      console.log("\n🔍 Verifying SalaryPayroll...");
      await hre.run("verify:verify", {
        address: payrollAddress,
        constructorArguments: [
          tokenAddress,
          deployer.address
        ],
      });
      console.log("✅ SalaryPayroll verified");
    } catch (error) {
      console.log("⚠️  Verification failed:", error.message);
      console.log("   You can verify manually later using:");
      console.log(`   npx hardhat verify --network ${hre.network.name} ${tokenAddress} "Confidential Salary Token" "cSAL" ${deployer.address}`);
      console.log(`   npx hardhat verify --network ${hre.network.name} ${payrollAddress} ${tokenAddress} ${deployer.address}`);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
