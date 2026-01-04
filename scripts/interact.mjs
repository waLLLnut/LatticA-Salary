const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function loadDeployment() {
  const deploymentPath = path.join(
    __dirname,
    "..",
    "deployments",
    `${hre.network.name}-latest.json`
  );

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`No deployment found for network ${hre.network.name}`);
  }

  return JSON.parse(fs.readFileSync(deploymentPath, "utf8"));
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log("Available commands:");
    console.log("  node scripts/interact.js addEmployee <address> <encryptedSalaryCid>");
    console.log("  node scripts/interact.js removeEmployee <address>");
    console.log("  node scripts/interact.js createPayment <employee> <amountCid> <start> <end> <taxCid> <memo>");
    console.log("  node scripts/interact.js getEmployee <address>");
    console.log("  node scripts/interact.js getPayment <paymentId>");
    console.log("  node scripts/interact.js getHistory <employee> <offset> <limit>");
    console.log("  node scripts/interact.js registerCiphertext <cid> <dataHex>");
    console.log("  node scripts/interact.js info");
    return;
  }

  const [signer] = await hre.ethers.getSigners();
  const deployment = await loadDeployment();

  const token = await hre.ethers.getContractAt(
    "CERC20",
    deployment.contracts.CERC20.address
  );

  const payroll = await hre.ethers.getContractAt(
    "SalaryPayroll",
    deployment.contracts.SalaryPayroll.address
  );

  console.log("🔗 Connected to:", hre.network.name);
  console.log("📍 Signer:", signer.address);
  console.log("📄 Token:", await token.getAddress());
  console.log("📄 Payroll:", await payroll.getAddress(), "\n");

  switch (command) {
    case "info":
      console.log("📊 Contract Information:");
      console.log("Token Name:", await token.name());
      console.log("Token Symbol:", await token.symbol());
      console.log("Total Payments:", (await payroll.getTotalPayments()).toString());
      console.log("\nRoles for", signer.address);
      const ADMIN_ROLE = await payroll.ADMIN_ROLE();
      const MANAGER_ROLE = await payroll.PAYROLL_MANAGER_ROLE();
      const COMPLIANCE_ROLE = await payroll.COMPLIANCE_ROLE();
      console.log("  Admin:", await payroll.hasRole(ADMIN_ROLE, signer.address));
      console.log("  Manager:", await payroll.hasRole(MANAGER_ROLE, signer.address));
      console.log("  Compliance:", await payroll.hasRole(COMPLIANCE_ROLE, signer.address));
      break;

    case "addEmployee": {
      const [, employeeAddr, salaryCid] = args;
      if (!employeeAddr || !salaryCid) {
        console.error("Usage: addEmployee <address> <encryptedSalaryCid>");
        process.exit(1);
      }
      console.log("➕ Adding employee:", employeeAddr);
      const tx = await payroll.addEmployee(employeeAddr, salaryCid);
      console.log("⏳ Transaction hash:", tx.hash);
      await tx.wait();
      console.log("✅ Employee added!");
      break;
    }

    case "removeEmployee": {
      const [, employeeAddr] = args;
      if (!employeeAddr) {
        console.error("Usage: removeEmployee <address>");
        process.exit(1);
      }
      console.log("➖ Removing employee:", employeeAddr);
      const tx = await payroll.removeEmployee(employeeAddr);
      console.log("⏳ Transaction hash:", tx.hash);
      await tx.wait();
      console.log("✅ Employee removed!");
      break;
    }

    case "createPayment": {
      const [, employee, amountCid, start, end, taxCid, ...memoArr] = args;
      if (!employee || !amountCid || !start || !end || !taxCid) {
        console.error("Usage: createPayment <employee> <amountCid> <start> <end> <taxCid> <memo>");
        process.exit(1);
      }
      const memo = memoArr.join(" ") || "Salary payment";
      console.log("💰 Creating payment for:", employee);
      const tx = await payroll.createPayment(
        employee,
        amountCid,
        parseInt(start),
        parseInt(end),
        taxCid,
        memo
      );
      console.log("⏳ Transaction hash:", tx.hash);
      const receipt = await tx.wait();

      // Parse PaymentCreated event
      const event = receipt.logs
        .map(log => {
          try {
            return payroll.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .find(e => e && e.name === "PaymentCreated");

      if (event) {
        console.log("✅ Payment created! ID:", event.args.paymentId.toString());
      }
      break;
    }

    case "getEmployee": {
      const [, employeeAddr] = args;
      if (!employeeAddr) {
        console.error("Usage: getEmployee <address>");
        process.exit(1);
      }
      const employee = await payroll.getEmployee(employeeAddr);
      console.log("👤 Employee Info:");
      console.log("  Active:", employee.isActive);
      console.log("  Hire Date:", new Date(Number(employee.hireDate) * 1000).toISOString());
      console.log("  Encrypted Salary CID:", employee.encryptedSalaryCid);
      console.log("  Last Payment:", employee.lastPaymentTimestamp.toString());
      console.log("  Total Payments:", employee.totalPayments.toString());
      break;
    }

    case "getPayment": {
      const [, paymentId] = args;
      if (!paymentId) {
        console.error("Usage: getPayment <paymentId>");
        process.exit(1);
      }
      const payment = await payroll.getPayment(paymentId);
      console.log("💸 Payment Info:");
      console.log("  Employee:", payment.employee);
      console.log("  Amount CID:", payment.encryptedAmountCid);
      console.log("  Status:", ["Pending", "Processed", "Failed", "Reversed"][payment.status]);
      console.log("  Timestamp:", new Date(Number(payment.timestamp) * 1000).toISOString());
      console.log("  Pay Period:",
        new Date(Number(payment.payPeriodStart) * 1000).toISOString(),
        "to",
        new Date(Number(payment.payPeriodEnd) * 1000).toISOString()
      );
      console.log("  Tax CID:", payment.taxAmountCid);
      console.log("  Memo:", payment.memo);
      break;
    }

    case "getHistory": {
      const [, employee, offset, limit] = args;
      if (!employee || !offset || !limit) {
        console.error("Usage: getHistory <employee> <offset> <limit>");
        process.exit(1);
      }
      const history = await payroll.getPaymentHistory(
        employee,
        parseInt(offset),
        parseInt(limit)
      );
      console.log(`📜 Payment History (${history.length} records):`);
      history.forEach((payment, i) => {
        console.log(`\n[${i + parseInt(offset)}]`);
        console.log("  Amount CID:", payment.encryptedAmountCid);
        console.log("  Status:", ["Pending", "Processed", "Failed", "Reversed"][payment.status]);
        console.log("  Date:", new Date(Number(payment.timestamp) * 1000).toISOString());
        console.log("  Memo:", payment.memo);
      });
      break;
    }

    case "registerCiphertext": {
      const [, cid, dataHex] = args;
      if (!cid || !dataHex) {
        console.error("Usage: registerCiphertext <cid> <dataHex>");
        process.exit(1);
      }
      console.log("🔐 Registering ciphertext with CID:", cid);
      const tx = await token.registerCiphertext(cid, dataHex);
      console.log("⏳ Transaction hash:", tx.hash);
      await tx.wait();
      console.log("✅ Ciphertext registered!");
      break;
    }

    default:
      console.error("Unknown command:", command);
      process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
