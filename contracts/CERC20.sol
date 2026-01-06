// SPDX-License-Identifier: BUSL-1.1
// Copyright (c) 2025 waLLLnut
// Project: LatticA | License: BSL 1.1 (Change Date: 2030-01-01, Change License: Apache-2.0)
// Contact: walllnut@walllnut.com | Maintainer: Seunghwan Lee <shlee@walllnut.com>

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CERC20 - Confidential ERC20 Token
 * @notice ERC20-like token with encrypted balances using FHE16
 * @dev Balances are stored as encrypted ciphertexts (bytes32 CID pointers)
 * @author waLLLnut (https://walllnut.com)
 */
contract CERC20 is Ownable, ReentrancyGuard {

    // Token metadata
    string public name;
    string public symbol;
    uint8 public constant decimals = 18;

    // Encrypted total supply (CID pointer to encrypted value)
    bytes32 public encryptedTotalSupply;

    // Mapping from address to encrypted balance (CID pointer)
    mapping(address => bytes32) private encryptedBalances;

    // Mapping for allowances (CID pointer to encrypted allowance)
    mapping(address => mapping(address => bytes32)) private encryptedAllowances;

    // FHE Executor address (authorized to update encrypted states)
    address public executor;

    // Ciphertext registry: CID => encrypted data
    mapping(bytes32 => Ciphertext) public ciphertexts;

    struct Ciphertext {
        bytes encryptedData;  // FHE16 encrypted data
        uint256 timestamp;
        bool exists;
    }

    // Events
    event Transfer(address indexed from, address indexed to, bytes32 encryptedAmount);
    event Approval(address indexed owner, address indexed spender, bytes32 encryptedAmount);
    event Mint(address indexed to, bytes32 encryptedAmount);
    event Burn(address indexed from, bytes32 encryptedAmount);
    event CiphertextRegistered(bytes32 indexed cid, address indexed registrar);
    event ExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);
    event BalanceUpdated(address indexed account, bytes32 oldCid, bytes32 newCid);

    // Modifiers
    modifier onlyExecutor() {
        require(msg.sender == executor, "CERC20: caller is not executor");
        _;
    }

    constructor(
        string memory _name,
        string memory _symbol,
        address _executor
    ) Ownable(msg.sender) {
        name = _name;
        symbol = _symbol;
        executor = _executor;

        // Initialize with zero total supply (will be registered separately)
        encryptedTotalSupply = bytes32(0);
    }

    /**
     * @notice Register a new ciphertext with its CID
     * @param cid Content Identifier for the ciphertext
     * @param encryptedData FHE16 encrypted data
     * @dev Limited to prevent DoS attacks via storage bloat
     */
    function registerCiphertext(
        bytes32 cid,
        bytes calldata encryptedData
    ) external {
        require(cid != bytes32(0), "CERC20: invalid CID");
        require(!ciphertexts[cid].exists, "CERC20: CID already exists");
        require(encryptedData.length > 0, "CERC20: empty ciphertext");

        // DoS protection: limit ciphertext size (FHE16 standard is ~133KB)
        require(encryptedData.length <= 200000, "CERC20: ciphertext too large");

        ciphertexts[cid] = Ciphertext({
            encryptedData: encryptedData,
            timestamp: block.timestamp,
            exists: true
        });

        emit CiphertextRegistered(cid, msg.sender);
    }

    /**
     * @notice Get encrypted balance of an account
     * @param account Address to query
     * @return CID pointer to encrypted balance
     */
    function balanceOf(address account) external view returns (bytes32) {
        return encryptedBalances[account];
    }

    /**
     * @notice Get ciphertext data by CID
     * @param cid Content Identifier
     * @return Ciphertext data
     */
    function getCiphertext(bytes32 cid) external view returns (Ciphertext memory) {
        require(ciphertexts[cid].exists, "CERC20: CID does not exist");
        return ciphertexts[cid];
    }

    /**
     * @notice Update encrypted balance (called by executor after FHE computation)
     * @param account Address whose balance to update
     * @param newBalanceCid New CID pointing to updated encrypted balance
     */
    function updateBalance(
        address account,
        bytes32 newBalanceCid
    ) external onlyExecutor {
        require(account != address(0), "CERC20: zero address");
        require(ciphertexts[newBalanceCid].exists, "CERC20: CID not registered");

        bytes32 oldCid = encryptedBalances[account];
        encryptedBalances[account] = newBalanceCid;

        emit BalanceUpdated(account, oldCid, newBalanceCid);
    }

    /**
     * @notice Transfer encrypted amount to another address
     * @dev Submits a job to FHE executor for encrypted computation
     * @param to Recipient address
     * @param encryptedAmountCid CID of encrypted amount to transfer
     */
    function transfer(
        address to,
        bytes32 encryptedAmountCid
    ) external nonReentrant returns (bool) {
        require(to != address(0), "CERC20: transfer to zero address");
        require(encryptedAmountCid != bytes32(0), "CERC20: invalid amount CID");
        require(ciphertexts[encryptedAmountCid].exists, "CERC20: amount CID not registered");

        // Emit transfer event (actual balance update happens via executor)
        emit Transfer(msg.sender, to, encryptedAmountCid);

        return true;
    }

    /**
     * @notice Approve spender to transfer encrypted amount
     * @param spender Address to approve
     * @param encryptedAmountCid CID of encrypted amount to approve
     */
    function approve(
        address spender,
        bytes32 encryptedAmountCid
    ) external returns (bool) {
        require(spender != address(0), "CERC20: approve to zero address");
        require(ciphertexts[encryptedAmountCid].exists, "CERC20: amount CID not registered");

        encryptedAllowances[msg.sender][spender] = encryptedAmountCid;
        emit Approval(msg.sender, spender, encryptedAmountCid);

        return true;
    }

    /**
     * @notice Get encrypted allowance
     * @param owner Owner address
     * @param spender Spender address
     * @return CID of encrypted allowance
     */
    function allowance(address owner, address spender) external view returns (bytes32) {
        return encryptedAllowances[owner][spender];
    }

    /**
     * @notice Mint encrypted tokens to an address
     * @param to Recipient address
     * @param encryptedAmountCid CID of encrypted amount to mint
     */
    function mint(
        address to,
        bytes32 encryptedAmountCid
    ) external onlyOwner {
        require(to != address(0), "CERC20: mint to zero address");
        require(ciphertexts[encryptedAmountCid].exists, "CERC20: amount CID not registered");

        emit Mint(to, encryptedAmountCid);
    }

    /**
     * @notice Burn encrypted tokens from an address
     * @param from Address to burn from
     * @param encryptedAmountCid CID of encrypted amount to burn
     */
    function burn(
        address from,
        bytes32 encryptedAmountCid
    ) external onlyOwner {
        require(from != address(0), "CERC20: burn from zero address");
        require(ciphertexts[encryptedAmountCid].exists, "CERC20: amount CID not registered");

        emit Burn(from, encryptedAmountCid);
    }

    /**
     * @notice Update executor address
     * @param newExecutor New executor address
     */
    function setExecutor(address newExecutor) external onlyOwner {
        require(newExecutor != address(0), "CERC20: zero address");
        address oldExecutor = executor;
        executor = newExecutor;
        emit ExecutorUpdated(oldExecutor, newExecutor);
    }

    /**
     * @notice Update encrypted total supply
     * @param newTotalSupplyCid New CID for encrypted total supply
     */
    function updateTotalSupply(bytes32 newTotalSupplyCid) external onlyExecutor {
        require(ciphertexts[newTotalSupplyCid].exists, "CERC20: CID not registered");
        encryptedTotalSupply = newTotalSupplyCid;
    }
}
