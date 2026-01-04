const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("SalaryPayroll", function () {
  let token;
  let payroll;
  let owner;
  let executor;
  let manager;
  let employee1;
  let employee2;

  const MOCK_CID_1 = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const MOCK_CID_2 = "0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
  const MOCK_CIPHERTEXT = "0x" + "00".repeat(133184);

  const ONE_MONTH = 30 * 24 * 60 * 60;

  beforeEach(async function () {
    [owner, executor, manager, employee1, employee2] = await ethers.getSigners();

    // Deploy CERC20
    const CERC20 = await ethers.getContractFactory("CERC20");
    token = await CERC20.deploy("Test Token", "TST", executor.address);
    await token.waitForDeployment();

    // Deploy SalaryPayroll
    const SalaryPayroll = await ethers.getContractFactory("SalaryPayroll");
    payroll = await SalaryPayroll.deploy(
      await token.getAddress(),
      executor.address
    );
    await payroll.waitForDeployment();

    // Grant manager role
    const PAYROLL_MANAGER_ROLE = await payroll.PAYROLL_MANAGER_ROLE();
    await payroll.grantRole(PAYROLL_MANAGER_ROLE, manager.address);

    // Register ciphertexts
    await token.registerCiphertext(MOCK_CID_1, MOCK_CIPHERTEXT);
    await token.registerCiphertext(MOCK_CID_2, MOCK_CIPHERTEXT);
  });

  describe("Deployment", function () {
    it("Should set correct token and executor", async function () {
      expect(await payroll.token()).to.equal(await token.getAddress());
      expect(await payroll.executor()).to.equal(executor.address);
    });

    it("Should grant admin role to deployer", async function () {
      const ADMIN_ROLE = await payroll.ADMIN_ROLE();
      expect(await payroll.hasRole(ADMIN_ROLE, owner.address)).to.be.true;
    });
  });

  describe("Employee Management", function () {
    it("Should add employee", async function () {
      await expect(payroll.addEmployee(employee1.address, MOCK_CID_1))
        .to.emit(payroll, "EmployeeAdded")
        .withArgs(employee1.address, MOCK_CID_1);

      const emp = await payroll.getEmployee(employee1.address);
      expect(emp.isActive).to.be.true;
      expect(emp.encryptedSalaryCid).to.equal(MOCK_CID_1);
    });

    it("Should reject duplicate employee", async function () {
      await payroll.addEmployee(employee1.address, MOCK_CID_1);

      await expect(
        payroll.addEmployee(employee1.address, MOCK_CID_2)
      ).to.be.revertedWith("SalaryPayroll: employee already exists");
    });

    it("Should remove employee", async function () {
      await payroll.addEmployee(employee1.address, MOCK_CID_1);

      await expect(payroll.removeEmployee(employee1.address))
        .to.emit(payroll, "EmployeeRemoved")
        .withArgs(employee1.address);

      const emp = await payroll.getEmployee(employee1.address);
      expect(emp.isActive).to.be.false;
    });

    it("Should update salary", async function () {
      await payroll.addEmployee(employee1.address, MOCK_CID_1);

      await expect(payroll.updateSalary(employee1.address, MOCK_CID_2))
        .to.emit(payroll, "SalaryUpdated")
        .withArgs(employee1.address, MOCK_CID_1, MOCK_CID_2);

      const emp = await payroll.getEmployee(employee1.address);
      expect(emp.encryptedSalaryCid).to.equal(MOCK_CID_2);
    });

    it("Should reject non-admin employee operations", async function () {
      await expect(
        payroll.connect(employee1).addEmployee(employee2.address, MOCK_CID_1)
      ).to.be.reverted;
    });
  });

  describe("Payment Creation", function () {
    beforeEach(async function () {
      await payroll.addEmployee(employee1.address, MOCK_CID_1);
    });

    it("Should create payment", async function () {
      const now = Math.floor(Date.now() / 1000);
      const start = now - ONE_MONTH;
      const end = now;

      await expect(
        payroll
          .connect(manager)
          .createPayment(
            employee1.address,
            MOCK_CID_1,
            start,
            end,
            MOCK_CID_2,
            "January 2024 salary"
          )
      )
        .to.emit(payroll, "PaymentCreated")
        .withArgs(0, employee1.address, MOCK_CID_1, start, end);

      const payment = await payroll.getPayment(0);
      expect(payment.employee).to.equal(employee1.address);
      expect(payment.encryptedAmountCid).to.equal(MOCK_CID_1);
      expect(payment.status).to.equal(0); // Pending
    });

    it("Should reject payment for inactive employee", async function () {
      await payroll.removeEmployee(employee1.address);

      const now = Math.floor(Date.now() / 1000);
      await expect(
        payroll
          .connect(manager)
          .createPayment(
            employee1.address,
            MOCK_CID_1,
            now - ONE_MONTH,
            now,
            MOCK_CID_2,
            "Test"
          )
      ).to.be.revertedWith("SalaryPayroll: employee not active");
    });

    it("Should reject payment from non-manager", async function () {
      const now = Math.floor(Date.now() / 1000);
      await expect(
        payroll
          .connect(employee1)
          .createPayment(
            employee1.address,
            MOCK_CID_1,
            now - ONE_MONTH,
            now,
            MOCK_CID_2,
            "Test"
          )
      ).to.be.reverted;
    });
  });

  describe("Batch Payment", function () {
    beforeEach(async function () {
      await payroll.addEmployee(employee1.address, MOCK_CID_1);
      await payroll.addEmployee(employee2.address, MOCK_CID_2);
    });

    it("Should create batch payment", async function () {
      const now = Math.floor(Date.now() / 1000);
      const start = now - ONE_MONTH;
      const end = now;

      await expect(
        payroll
          .connect(manager)
          .createBatchPayment(
            [employee1.address, employee2.address],
            [MOCK_CID_1, MOCK_CID_2],
            start,
            end,
            [MOCK_CID_2, MOCK_CID_1],
            "December 2024 payroll"
          )
      )
        .to.emit(payroll, "BatchPaymentInitiated")
        .withArgs(0, 2);

      const batch = await payroll.getBatchPayment(0);
      expect(batch.paymentIds.length).to.equal(2);
      expect(batch.initiatedBy).to.equal(manager.address);
    });

    it("Should reject mismatched array lengths", async function () {
      const now = Math.floor(Date.now() / 1000);

      await expect(
        payroll
          .connect(manager)
          .createBatchPayment(
            [employee1.address, employee2.address],
            [MOCK_CID_1],
            now - ONE_MONTH,
            now,
            [MOCK_CID_2, MOCK_CID_1],
            "Test"
          )
      ).to.be.revertedWith("SalaryPayroll: length mismatch");
    });

    it("Should reject empty batch", async function () {
      const now = Math.floor(Date.now() / 1000);

      await expect(
        payroll
          .connect(manager)
          .createBatchPayment([], [], now - ONE_MONTH, now, [], "Test")
      ).to.be.revertedWith("SalaryPayroll: empty batch");
    });
  });

  describe("Payment Processing", function () {
    let paymentId;

    beforeEach(async function () {
      await payroll.addEmployee(employee1.address, MOCK_CID_1);

      const now = Math.floor(Date.now() / 1000);
      const tx = await payroll
        .connect(manager)
        .createPayment(
          employee1.address,
          MOCK_CID_1,
          now - ONE_MONTH,
          now,
          MOCK_CID_2,
          "Test payment"
        );

      paymentId = 0;
    });

    it("Should process payment (executor only)", async function () {
      await expect(payroll.connect(executor).processPayment(paymentId, true))
        .to.emit(payroll, "PaymentProcessed")
        .withArgs(paymentId);

      const payment = await payroll.getPayment(paymentId);
      expect(payment.status).to.equal(1); // Processed

      const emp = await payroll.getEmployee(employee1.address);
      expect(emp.totalPayments).to.equal(1);
    });

    it("Should mark payment as failed", async function () {
      await expect(payroll.connect(executor).processPayment(paymentId, false))
        .to.emit(payroll, "PaymentFailed")
        .withArgs(paymentId, "Executor reported failure");

      const payment = await payroll.getPayment(paymentId);
      expect(payment.status).to.equal(2); // Failed
    });

    it("Should reject processing from non-executor", async function () {
      await expect(
        payroll.connect(manager).processPayment(paymentId, true)
      ).to.be.revertedWith("SalaryPayroll: caller is not executor");
    });

    it("Should reject processing already processed payment", async function () {
      await payroll.connect(executor).processPayment(paymentId, true);

      await expect(
        payroll.connect(executor).processPayment(paymentId, true)
      ).to.be.revertedWith("SalaryPayroll: payment not pending");
    });
  });

  describe("Payment History", function () {
    beforeEach(async function () {
      await payroll.addEmployee(employee1.address, MOCK_CID_1);
      await payroll.addEmployee(employee2.address, MOCK_CID_2);

      const now = Math.floor(Date.now() / 1000);

      // Create payments for employee1
      for (let i = 0; i < 5; i++) {
        await payroll
          .connect(manager)
          .createPayment(
            employee1.address,
            MOCK_CID_1,
            now - ONE_MONTH * (i + 1),
            now - ONE_MONTH * i,
            MOCK_CID_2,
            `Payment ${i}`
          );
      }

      // Create one payment for employee2
      await payroll
        .connect(manager)
        .createPayment(
          employee2.address,
          MOCK_CID_2,
          now - ONE_MONTH,
          now,
          MOCK_CID_1,
          "Payment 0"
        );
    });

    it("Should get payment history", async function () {
      const history = await payroll.getPaymentHistory(
        employee1.address,
        0,
        10
      );

      expect(history.length).to.equal(5);
      history.forEach((payment) => {
        expect(payment.employee).to.equal(employee1.address);
      });
    });

    it("Should paginate payment history", async function () {
      const page1 = await payroll.getPaymentHistory(employee1.address, 0, 2);
      expect(page1.length).to.equal(2);

      const page2 = await payroll.getPaymentHistory(employee1.address, 2, 2);
      expect(page2.length).to.equal(2);

      const page3 = await payroll.getPaymentHistory(employee1.address, 4, 2);
      expect(page3.length).to.equal(1);
    });
  });

  describe("Executor Management", function () {
    it("Should update executor (admin only)", async function () {
      const newExecutor = employee1.address;

      await expect(payroll.setExecutor(newExecutor))
        .to.emit(payroll, "ExecutorUpdated")
        .withArgs(executor.address, newExecutor);

      expect(await payroll.executor()).to.equal(newExecutor);
    });

    it("Should reject zero address", async function () {
      await expect(
        payroll.setExecutor(ethers.ZeroAddress)
      ).to.be.revertedWith("SalaryPayroll: zero address");
    });

    it("Should reject non-admin", async function () {
      await expect(
        payroll.connect(employee1).setExecutor(employee2.address)
      ).to.be.reverted;
    });
  });
});
