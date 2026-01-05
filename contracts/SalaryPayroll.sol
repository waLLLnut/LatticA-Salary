// SPDX-License-Identifier: LicenseRef-LatticA-Restrictive
// Copyright (c) 2025 waLLLnut
// Project: LatticA
// License: LatticA Restrictive License v1.0
// Commercial use is prohibited without explicit written permission.
// Contact: walllnut@walllnut.com | Maintainer: Seunghwan Lee <shlee@walllnut.com>

pragma solidity ^0.8.28;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./CERC20.sol";

/**
 * @title SalaryPayroll
 * @notice Confidential salary payment system using FHE16 encrypted amounts
 * @dev Manages salary payments, history, and compliance features
 * @author waLLLnut (https://walllnut.com)
 */
contract SalaryPayroll is AccessControl, ReentrancyGuard {

    bytes32 public constant ADMIN_ROLE = keccak256("ADMIN_ROLE");
    bytes32 public constant PAYROLL_MANAGER_ROLE = keccak256("PAYROLL_MANAGER_ROLE");
    bytes32 public constant COMPLIANCE_ROLE = keccak256("COMPLIANCE_ROLE");

    CERC20 public token;
    address public executor;

    // Payment record
    struct Payment {
        address employee;
        bytes32 encryptedAmountCid;  // CID to encrypted salary amount
        uint256 timestamp;
        uint256 payPeriodStart;
        uint256 payPeriodEnd;
        bytes32 taxAmountCid;         // CID to encrypted tax amount
        PaymentStatus status;
        string memo;
    }

    enum PaymentStatus {
        Pending,
        Processed,
        Failed,
        Reversed
    }

    // Employee info
    struct Employee {
        bool isActive;
        uint256 hireDate;
        bytes32 encryptedSalaryCid;   // CID to base encrypted salary
        uint256 lastPaymentTimestamp;
        uint256 totalPayments;
    }

    // Storage
    mapping(address => Employee) public employees;
    mapping(uint256 => Payment) public payments;
    uint256 public paymentCounter;

    // Batch payment tracking
    struct BatchPayment {
        uint256[] paymentIds;
        uint256 timestamp;
        address initiatedBy;
        uint256 successCount;
        uint256 failureCount;
    }

    mapping(uint256 => BatchPayment) public batchPayments;
    uint256 public batchCounter;

    // Tax and compliance
    mapping(address => bytes32) public encryptedTaxWithheld;  // Total tax per employee
    mapping(uint256 => ComplianceRecord) public complianceRecords;

    struct ComplianceRecord {
        uint256 paymentId;
        bytes32 encryptedGrossCid;
        bytes32 encryptedNetCid;
        bytes32 encryptedTaxCid;
        uint256 timestamp;
        bool verified;
    }

    // Events
    event EmployeeAdded(address indexed employee, bytes32 encryptedSalaryCid);
    event EmployeeRemoved(address indexed employee);
    event SalaryUpdated(address indexed employee, bytes32 oldCid, bytes32 newCid);
    event PaymentCreated(
        uint256 indexed paymentId,
        address indexed employee,
        bytes32 encryptedAmountCid,
        uint256 payPeriodStart,
        uint256 payPeriodEnd
    );
    event PaymentProcessed(uint256 indexed paymentId);
    event PaymentFailed(uint256 indexed paymentId, string reason);
    event BatchPaymentInitiated(uint256 indexed batchId, uint256 employeeCount);
    event BatchPaymentCompleted(uint256 indexed batchId, uint256 successCount, uint256 failureCount);
    event TaxRecorded(address indexed employee, bytes32 encryptedTaxCid);
    event ComplianceRecordCreated(uint256 indexed paymentId, uint256 indexed recordId);
    event ExecutorUpdated(address indexed oldExecutor, address indexed newExecutor);

    constructor(
        address _token,
        address _executor
    ) {
        require(_token != address(0), "SalaryPayroll: zero token address");
        require(_executor != address(0), "SalaryPayroll: zero executor address");

        token = CERC20(_token);
        executor = _executor;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ADMIN_ROLE, msg.sender);
        _grantRole(PAYROLL_MANAGER_ROLE, msg.sender);
    }

    modifier onlyExecutor() {
        require(msg.sender == executor, "SalaryPayroll: caller is not executor");
        _;
    }

    /**
     * @notice Add a new employee
     * @param employee Employee address
     * @param encryptedSalaryCid CID to encrypted base salary
     */
    function addEmployee(
        address employee,
        bytes32 encryptedSalaryCid
    ) external onlyRole(ADMIN_ROLE) {
        require(employee != address(0), "SalaryPayroll: zero address");
        require(!employees[employee].isActive, "SalaryPayroll: employee already exists");
        require(encryptedSalaryCid != bytes32(0), "SalaryPayroll: invalid salary CID");

        employees[employee] = Employee({
            isActive: true,
            hireDate: block.timestamp,
            encryptedSalaryCid: encryptedSalaryCid,
            lastPaymentTimestamp: 0,
            totalPayments: 0
        });

        emit EmployeeAdded(employee, encryptedSalaryCid);
    }

    /**
     * @notice Remove an employee
     * @param employee Employee address
     */
    function removeEmployee(address employee) external onlyRole(ADMIN_ROLE) {
        require(employees[employee].isActive, "SalaryPayroll: employee not found");
        employees[employee].isActive = false;
        emit EmployeeRemoved(employee);
    }

    /**
     * @notice Update employee base salary
     * @param employee Employee address
     * @param newEncryptedSalaryCid New CID to encrypted salary
     */
    function updateSalary(
        address employee,
        bytes32 newEncryptedSalaryCid
    ) external onlyRole(ADMIN_ROLE) {
        require(employees[employee].isActive, "SalaryPayroll: employee not found");
        require(newEncryptedSalaryCid != bytes32(0), "SalaryPayroll: invalid salary CID");

        bytes32 oldCid = employees[employee].encryptedSalaryCid;
        employees[employee].encryptedSalaryCid = newEncryptedSalaryCid;

        emit SalaryUpdated(employee, oldCid, newEncryptedSalaryCid);
    }

    /**
     * @notice Create a single salary payment
     * @param employee Employee address
     * @param encryptedAmountCid CID to encrypted payment amount
     * @param payPeriodStart Start of pay period (unix timestamp)
     * @param payPeriodEnd End of pay period (unix timestamp)
     * @param taxAmountCid CID to encrypted tax amount
     * @param memo Payment memo
     */
    function createPayment(
        address employee,
        bytes32 encryptedAmountCid,
        uint256 payPeriodStart,
        uint256 payPeriodEnd,
        bytes32 taxAmountCid,
        string calldata memo
    ) public onlyRole(PAYROLL_MANAGER_ROLE) returns (uint256) {
        require(employees[employee].isActive, "SalaryPayroll: employee not active");
        require(encryptedAmountCid != bytes32(0), "SalaryPayroll: invalid amount CID");
        require(payPeriodEnd > payPeriodStart, "SalaryPayroll: invalid pay period");

        uint256 paymentId = paymentCounter++;

        payments[paymentId] = Payment({
            employee: employee,
            encryptedAmountCid: encryptedAmountCid,
            timestamp: block.timestamp,
            payPeriodStart: payPeriodStart,
            payPeriodEnd: payPeriodEnd,
            taxAmountCid: taxAmountCid,
            status: PaymentStatus.Pending,
            memo: memo
        });

        emit PaymentCreated(
            paymentId,
            employee,
            encryptedAmountCid,
            payPeriodStart,
            payPeriodEnd
        );

        return paymentId;
    }

    /**
     * @notice Create batch salary payments
     * @param employeeAddresses Array of employee addresses
     * @param encryptedAmountCids Array of CIDs to encrypted amounts
     * @param payPeriodStart Start of pay period
     * @param payPeriodEnd End of pay period
     * @param taxAmountCids Array of CIDs to encrypted tax amounts
     * @param memo Batch memo
     */
    function createBatchPayment(
        address[] calldata employeeAddresses,
        bytes32[] calldata encryptedAmountCids,
        uint256 payPeriodStart,
        uint256 payPeriodEnd,
        bytes32[] calldata taxAmountCids,
        string calldata memo
    ) external onlyRole(PAYROLL_MANAGER_ROLE) returns (uint256) {
        require(
            employeeAddresses.length == encryptedAmountCids.length,
            "SalaryPayroll: length mismatch"
        );
        require(
            employeeAddresses.length == taxAmountCids.length,
            "SalaryPayroll: tax length mismatch"
        );
        require(employeeAddresses.length > 0, "SalaryPayroll: empty batch");

        uint256 batchId = batchCounter++;
        uint256[] memory paymentIds = new uint256[](employeeAddresses.length);

        for (uint256 i = 0; i < employeeAddresses.length; i++) {
            paymentIds[i] = createPayment(
                employeeAddresses[i],
                encryptedAmountCids[i],
                payPeriodStart,
                payPeriodEnd,
                taxAmountCids[i],
                memo
            );
        }

        batchPayments[batchId] = BatchPayment({
            paymentIds: paymentIds,
            timestamp: block.timestamp,
            initiatedBy: msg.sender,
            successCount: 0,
            failureCount: 0
        });

        emit BatchPaymentInitiated(batchId, employeeAddresses.length);

        return batchId;
    }

    /**
     * @notice Process payment (called by executor after FHE computation)
     * @param paymentId Payment ID
     * @param success Whether the payment succeeded
     */
    function processPayment(
        uint256 paymentId,
        bool success
    ) external onlyExecutor {
        require(paymentId < paymentCounter, "SalaryPayroll: invalid payment ID");
        Payment storage payment = payments[paymentId];
        require(payment.status == PaymentStatus.Pending, "SalaryPayroll: payment not pending");

        if (success) {
            payment.status = PaymentStatus.Processed;
            Employee storage emp = employees[payment.employee];
            emp.lastPaymentTimestamp = block.timestamp;
            emp.totalPayments++;

            emit PaymentProcessed(paymentId);
        } else {
            payment.status = PaymentStatus.Failed;
            emit PaymentFailed(paymentId, "Executor reported failure");
        }
    }

    /**
     * @notice Get payment history for an employee
     * @param employee Employee address
     * @param offset Starting index
     * @param limit Maximum number of records
     */
    function getPaymentHistory(
        address employee,
        uint256 offset,
        uint256 limit
    ) external view returns (Payment[] memory) {
        uint256 count = 0;

        // First pass: count matching payments
        for (uint256 i = 0; i < paymentCounter; i++) {
            if (payments[i].employee == employee) {
                if (count >= offset && count < offset + limit) {
                    count++;
                } else if (count < offset) {
                    count++;
                } else {
                    break;
                }
            }
        }

        // Calculate actual size
        uint256 size = count > offset ? count - offset : 0;
        if (size > limit) size = limit;

        Payment[] memory result = new Payment[](size);
        uint256 resultIndex = 0;
        count = 0;

        // Second pass: populate result
        for (uint256 i = 0; i < paymentCounter && resultIndex < size; i++) {
            if (payments[i].employee == employee) {
                if (count >= offset) {
                    result[resultIndex] = payments[i];
                    resultIndex++;
                }
                count++;
            }
        }

        return result;
    }

    /**
     * @notice Record compliance data for a payment
     * @param paymentId Payment ID
     * @param grossCid CID to encrypted gross amount
     * @param netCid CID to encrypted net amount
     * @param taxCid CID to encrypted tax amount
     */
    function recordCompliance(
        uint256 paymentId,
        bytes32 grossCid,
        bytes32 netCid,
        bytes32 taxCid
    ) external onlyRole(COMPLIANCE_ROLE) returns (uint256) {
        require(paymentId < paymentCounter, "SalaryPayroll: invalid payment ID");

        uint256 recordId = uint256(keccak256(abi.encodePacked(paymentId, block.timestamp)));

        complianceRecords[recordId] = ComplianceRecord({
            paymentId: paymentId,
            encryptedGrossCid: grossCid,
            encryptedNetCid: netCid,
            encryptedTaxCid: taxCid,
            timestamp: block.timestamp,
            verified: true
        });

        emit ComplianceRecordCreated(paymentId, recordId);
        return recordId;
    }

    /**
     * @notice Get employee info
     * @param employee Employee address
     */
    function getEmployee(address employee) external view returns (Employee memory) {
        return employees[employee];
    }

    /**
     * @notice Get payment details
     * @param paymentId Payment ID
     */
    function getPayment(uint256 paymentId) external view returns (Payment memory) {
        require(paymentId < paymentCounter, "SalaryPayroll: invalid payment ID");
        return payments[paymentId];
    }

    /**
     * @notice Update executor address
     * @param newExecutor New executor address
     */
    function setExecutor(address newExecutor) external onlyRole(ADMIN_ROLE) {
        require(newExecutor != address(0), "SalaryPayroll: zero address");
        address oldExecutor = executor;
        executor = newExecutor;
        emit ExecutorUpdated(oldExecutor, newExecutor);
    }

    /**
     * @notice Get total number of payments
     */
    function getTotalPayments() external view returns (uint256) {
        return paymentCounter;
    }

    /**
     * @notice Get batch payment details
     * @param batchId Batch ID
     */
    function getBatchPayment(uint256 batchId) external view returns (BatchPayment memory) {
        require(batchId < batchCounter, "SalaryPayroll: invalid batch ID");
        return batchPayments[batchId];
    }
}
