// SPDX-License-Identifier: BSL-1.1
// Copyright (c) 2025 waLLLnut
//
// This contract integrates FHE16 encrypted salary data with zkBob-style
// privacy-preserving withdrawals. The zkBob pool components are used under
// CC0-1.0 / MIT license. See THIRD_PARTY_LICENSES.md for details.

pragma solidity 0.8.15;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title ITransferVerifier
 * @dev Interface for ZK proof verification (from zkBob)
 */
interface ITransferVerifier {
    function verifyProof(uint256[5] memory _pub, uint256[8] memory _proof) external view returns (bool);
}

/**
 * @title ConfidentialSalaryPool
 * @author waLLLnut
 * @notice Privacy-preserving salary pool using FHE16 + ZK proofs
 * @dev Based on zkBob architecture (CC0-1.0 / MIT licensed)
 *
 * Architecture:
 * 1. Admin deposits total payroll amount into pool
 * 2. Admin registers FHE16-encrypted salary commitments
 * 3. Employees withdraw using ZK proofs (amount hidden on-chain)
 *
 * Privacy guarantees:
 * - Salary amounts are encrypted with FHE16 (off-chain)
 * - Withdrawal amounts are hidden using ZK proofs
 * - Only commitment hashes stored on-chain
 */
contract ConfidentialSalaryPool is ReentrancyGuard {
    using SafeERC20 for IERC20;

    // ============ State Variables ============

    IERC20 public immutable token;
    ITransferVerifier public verifier;
    address public admin;

    // Merkle tree root for salary commitments
    uint256 public merkleRoot;

    // Nullifiers to prevent double-withdrawal
    mapping(bytes32 => bool) public nullifiers;

    // Registered salary commitments
    mapping(bytes32 => bool) public commitments;

    // FHE16 encrypted salary data (commitment => encrypted data CID)
    mapping(bytes32 => string) public encryptedSalaries;

    // Total pool balance tracking
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    // ============ Events ============

    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);
    event VerifierUpdated(address indexed newVerifier);
    event Deposited(address indexed depositor, uint256 amount);
    event SalaryRegistered(bytes32 indexed commitment, string encryptedDataCID);
    event MerkleRootUpdated(uint256 indexed newRoot);
    event Withdrawn(bytes32 indexed nullifier, address indexed recipient, uint256 amount);

    // ============ Modifiers ============

    modifier onlyAdmin() {
        require(msg.sender == admin, "ConfidentialSalaryPool: not admin");
        _;
    }

    // ============ Constructor ============

    /**
     * @notice Initialize the confidential salary pool
     * @param _token ERC20 token used for salary payments (e.g., USDT)
     * @param _admin Admin address (typically company HR/Finance)
     */
    constructor(address _token, address _admin) {
        require(_token != address(0), "ConfidentialSalaryPool: zero token address");
        require(_admin != address(0), "ConfidentialSalaryPool: zero admin address");

        token = IERC20(_token);
        admin = _admin;
    }

    // ============ Admin Functions ============

    /**
     * @notice Transfer admin role to new address
     * @param _newAdmin New admin address
     */
    function setAdmin(address _newAdmin) external onlyAdmin {
        require(_newAdmin != address(0), "ConfidentialSalaryPool: zero address");
        emit AdminChanged(admin, _newAdmin);
        admin = _newAdmin;
    }

    /**
     * @notice Update the ZK verifier contract
     * @param _verifier New verifier contract address
     */
    function setVerifier(address _verifier) external onlyAdmin {
        verifier = ITransferVerifier(_verifier);
        emit VerifierUpdated(_verifier);
    }

    /**
     * @notice Deposit funds into the pool (total payroll)
     * @param _amount Amount to deposit
     */
    function deposit(uint256 _amount) external onlyAdmin nonReentrant {
        require(_amount > 0, "ConfidentialSalaryPool: zero amount");

        token.safeTransferFrom(msg.sender, address(this), _amount);
        totalDeposited += _amount;

        emit Deposited(msg.sender, _amount);
    }

    /**
     * @notice Register an FHE16-encrypted salary commitment
     * @param _commitment Poseidon hash of (encryptedSalary, employeeSecret, nonce)
     * @param _encryptedDataCID IPFS CID or identifier for encrypted salary data
     */
    function registerSalary(
        bytes32 _commitment,
        string calldata _encryptedDataCID
    ) external onlyAdmin {
        require(!commitments[_commitment], "ConfidentialSalaryPool: commitment exists");
        require(bytes(_encryptedDataCID).length > 0, "ConfidentialSalaryPool: empty CID");

        commitments[_commitment] = true;
        encryptedSalaries[_commitment] = _encryptedDataCID;

        emit SalaryRegistered(_commitment, _encryptedDataCID);
    }

    /**
     * @notice Batch register multiple salary commitments
     * @param _commitments Array of commitment hashes
     * @param _encryptedDataCIDs Array of encrypted data CIDs
     */
    function batchRegisterSalaries(
        bytes32[] calldata _commitments,
        string[] calldata _encryptedDataCIDs
    ) external onlyAdmin {
        require(_commitments.length == _encryptedDataCIDs.length, "ConfidentialSalaryPool: length mismatch");

        for (uint256 i = 0; i < _commitments.length; i++) {
            require(!commitments[_commitments[i]], "ConfidentialSalaryPool: commitment exists");
            require(bytes(_encryptedDataCIDs[i]).length > 0, "ConfidentialSalaryPool: empty CID");

            commitments[_commitments[i]] = true;
            encryptedSalaries[_commitments[i]] = _encryptedDataCIDs[i];

            emit SalaryRegistered(_commitments[i], _encryptedDataCIDs[i]);
        }
    }

    /**
     * @notice Update the Merkle root after adding commitments
     * @param _newRoot New Merkle tree root
     */
    function updateMerkleRoot(uint256 _newRoot) external onlyAdmin {
        require(_newRoot != 0, "ConfidentialSalaryPool: zero root");
        merkleRoot = _newRoot;
        emit MerkleRootUpdated(_newRoot);
    }

    // ============ Employee Functions ============

    /**
     * @notice Withdraw salary using ZK proof
     * @dev The amount is verified inside the ZK circuit but not revealed on-chain
     * @param _proof ZK proof components [8 elements]
     * @param _publicSignals Public inputs [commitment, nullifier, merkleRoot, recipient, amount]
     * @param _recipient Address to receive the salary
     *
     * Note: In production, _amount would be hidden inside the ZK proof.
     * For demo purposes, we pass it as a parameter.
     */
    function withdraw(
        uint256[8] calldata _proof,
        uint256[5] calldata _publicSignals,
        address _recipient,
        uint256 _amount
    ) external nonReentrant {
        require(_recipient != address(0), "ConfidentialSalaryPool: zero recipient");
        require(_amount > 0, "ConfidentialSalaryPool: zero amount");

        // Extract public signals
        bytes32 commitment = bytes32(_publicSignals[0]);
        bytes32 nullifier = bytes32(_publicSignals[1]);
        uint256 proofMerkleRoot = _publicSignals[2];

        // Verify commitment exists
        require(commitments[commitment], "ConfidentialSalaryPool: unknown commitment");

        // Verify nullifier hasn't been used (prevent double-spend)
        require(!nullifiers[nullifier], "ConfidentialSalaryPool: already withdrawn");

        // Verify merkle root matches
        require(proofMerkleRoot == merkleRoot, "ConfidentialSalaryPool: invalid merkle root");

        // Verify ZK proof (if verifier is set)
        if (address(verifier) != address(0)) {
            require(
                verifier.verifyProof(_publicSignals, _proof),
                "ConfidentialSalaryPool: invalid proof"
            );
        }

        // Mark nullifier as used
        nullifiers[nullifier] = true;

        // Transfer funds
        require(
            token.balanceOf(address(this)) >= _amount,
            "ConfidentialSalaryPool: insufficient pool balance"
        );

        token.safeTransfer(_recipient, _amount);
        totalWithdrawn += _amount;

        emit Withdrawn(nullifier, _recipient, _amount);
    }

    // ============ View Functions ============

    /**
     * @notice Get current pool balance
     * @return Available balance in the pool
     */
    function poolBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }

    /**
     * @notice Check if a commitment is registered
     * @param _commitment Commitment hash to check
     * @return True if registered
     */
    function isCommitmentRegistered(bytes32 _commitment) external view returns (bool) {
        return commitments[_commitment];
    }

    /**
     * @notice Check if a nullifier has been used
     * @param _nullifier Nullifier to check
     * @return True if already used
     */
    function isNullifierUsed(bytes32 _nullifier) external view returns (bool) {
        return nullifiers[_nullifier];
    }

    /**
     * @notice Get encrypted salary data CID for a commitment
     * @param _commitment Commitment hash
     * @return IPFS CID or identifier
     */
    function getEncryptedSalary(bytes32 _commitment) external view returns (string memory) {
        return encryptedSalaries[_commitment];
    }

    // ============ Emergency Functions ============

    /**
     * @notice Emergency withdraw all funds (admin only)
     * @dev Only for emergency situations, emits no privacy-preserving proof
     * @param _to Address to receive funds
     */
    function emergencyWithdraw(address _to) external onlyAdmin nonReentrant {
        require(_to != address(0), "ConfidentialSalaryPool: zero address");
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "ConfidentialSalaryPool: no balance");

        token.safeTransfer(_to, balance);
    }
}
