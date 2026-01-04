const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("CERC20", function () {
  let token;
  let owner;
  let executor;
  let user1;
  let user2;

  const MOCK_CID = "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef";
  const MOCK_CIPHERTEXT = "0x" + "00".repeat(133184); // 33296 * 4 bytes

  beforeEach(async function () {
    [owner, executor, user1, user2] = await ethers.getSigners();

    const CERC20 = await ethers.getContractFactory("CERC20");
    token = await CERC20.deploy(
      "Test Salary Token",
      "TST",
      executor.address
    );
    await token.waitForDeployment();
  });

  describe("Deployment", function () {
    it("Should set the correct token name and symbol", async function () {
      expect(await token.name()).to.equal("Test Salary Token");
      expect(await token.symbol()).to.equal("TST");
      expect(await token.decimals()).to.equal(18);
    });

    it("Should set the correct executor", async function () {
      expect(await token.executor()).to.equal(executor.address);
    });

    it("Should set the correct owner", async function () {
      expect(await token.owner()).to.equal(owner.address);
    });
  });

  describe("Ciphertext Registration", function () {
    it("Should register a ciphertext", async function () {
      await expect(token.registerCiphertext(MOCK_CID, MOCK_CIPHERTEXT))
        .to.emit(token, "CiphertextRegistered")
        .withArgs(MOCK_CID, owner.address);

      const ct = await token.getCiphertext(MOCK_CID);
      expect(ct.exists).to.be.true;
      expect(ct.encryptedData).to.equal(MOCK_CIPHERTEXT);
    });

    it("Should reject duplicate CID registration", async function () {
      await token.registerCiphertext(MOCK_CID, MOCK_CIPHERTEXT);

      await expect(
        token.registerCiphertext(MOCK_CID, MOCK_CIPHERTEXT)
      ).to.be.revertedWith("CERC20: CID already exists");
    });

    it("Should reject zero CID", async function () {
      const ZERO_CID = "0x" + "00".repeat(32);
      await expect(
        token.registerCiphertext(ZERO_CID, MOCK_CIPHERTEXT)
      ).to.be.revertedWith("CERC20: invalid CID");
    });

    it("Should reject empty ciphertext", async function () {
      await expect(
        token.registerCiphertext(MOCK_CID, "0x")
      ).to.be.revertedWith("CERC20: empty ciphertext");
    });
  });

  describe("Balance Management", function () {
    beforeEach(async function () {
      await token.registerCiphertext(MOCK_CID, MOCK_CIPHERTEXT);
    });

    it("Should update balance (executor only)", async function () {
      await expect(
        token.connect(executor).updateBalance(user1.address, MOCK_CID)
      )
        .to.emit(token, "BalanceUpdated")
        .withArgs(user1.address, ethers.ZeroHash, MOCK_CID);

      expect(await token.balanceOf(user1.address)).to.equal(MOCK_CID);
    });

    it("Should reject balance update from non-executor", async function () {
      await expect(
        token.connect(user1).updateBalance(user1.address, MOCK_CID)
      ).to.be.revertedWith("CERC20: caller is not executor");
    });

    it("Should reject unregistered CID in balance update", async function () {
      const FAKE_CID = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      await expect(
        token.connect(executor).updateBalance(user1.address, FAKE_CID)
      ).to.be.revertedWith("CERC20: CID not registered");
    });
  });

  describe("Transfer", function () {
    beforeEach(async function () {
      await token.registerCiphertext(MOCK_CID, MOCK_CIPHERTEXT);
    });

    it("Should emit Transfer event", async function () {
      await expect(token.connect(user1).transfer(user2.address, MOCK_CID))
        .to.emit(token, "Transfer")
        .withArgs(user1.address, user2.address, MOCK_CID);
    });

    it("Should reject transfer to zero address", async function () {
      await expect(
        token.connect(user1).transfer(ethers.ZeroAddress, MOCK_CID)
      ).to.be.revertedWith("CERC20: transfer to zero address");
    });

    it("Should reject unregistered CID", async function () {
      const FAKE_CID = "0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff";
      await expect(
        token.connect(user1).transfer(user2.address, FAKE_CID)
      ).to.be.revertedWith("CERC20: amount CID not registered");
    });
  });

  describe("Approve and Allowance", function () {
    beforeEach(async function () {
      await token.registerCiphertext(MOCK_CID, MOCK_CIPHERTEXT);
    });

    it("Should approve spender", async function () {
      await expect(token.connect(user1).approve(user2.address, MOCK_CID))
        .to.emit(token, "Approval")
        .withArgs(user1.address, user2.address, MOCK_CID);

      expect(await token.allowance(user1.address, user2.address)).to.equal(
        MOCK_CID
      );
    });

    it("Should reject approve to zero address", async function () {
      await expect(
        token.connect(user1).approve(ethers.ZeroAddress, MOCK_CID)
      ).to.be.revertedWith("CERC20: approve to zero address");
    });
  });

  describe("Mint and Burn", function () {
    beforeEach(async function () {
      await token.registerCiphertext(MOCK_CID, MOCK_CIPHERTEXT);
    });

    it("Should mint tokens (owner only)", async function () {
      await expect(token.mint(user1.address, MOCK_CID))
        .to.emit(token, "Mint")
        .withArgs(user1.address, MOCK_CID);
    });

    it("Should reject mint from non-owner", async function () {
      await expect(
        token.connect(user1).mint(user1.address, MOCK_CID)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });

    it("Should burn tokens (owner only)", async function () {
      await expect(token.burn(user1.address, MOCK_CID))
        .to.emit(token, "Burn")
        .withArgs(user1.address, MOCK_CID);
    });

    it("Should reject burn from non-owner", async function () {
      await expect(
        token.connect(user1).burn(user1.address, MOCK_CID)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });

  describe("Executor Management", function () {
    it("Should update executor (owner only)", async function () {
      const newExecutor = user1.address;
      await expect(token.setExecutor(newExecutor))
        .to.emit(token, "ExecutorUpdated")
        .withArgs(executor.address, newExecutor);

      expect(await token.executor()).to.equal(newExecutor);
    });

    it("Should reject zero address executor", async function () {
      await expect(
        token.setExecutor(ethers.ZeroAddress)
      ).to.be.revertedWith("CERC20: zero address");
    });

    it("Should reject executor update from non-owner", async function () {
      await expect(
        token.connect(user1).setExecutor(user2.address)
      ).to.be.revertedWithCustomError(token, "OwnableUnauthorizedAccount");
    });
  });
});
