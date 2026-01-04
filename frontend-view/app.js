/**
 * LatticA Salary - Frontend Application
 *
 * Privacy-First Payroll System on Mantle Network
 * - USDT batch payments (public on-chain)
 * - FHE16 encrypted payslips (off-chain)
 * - On-chain commitment only (hash of CID)
 */

// ============================================
// Configuration
// ============================================

const CONFIG = {
  CHAIN_ID: 5003,
  CHAIN_ID_HEX: '0x138b',
  CHAIN_NAME: 'Mantle Sepolia',
  RPC_URL: 'https://rpc.sepolia.mantle.xyz',
  EXPLORER_URL: 'https://sepolia.mantlescan.xyz',
  CURRENCY: {
    name: 'MNT',
    symbol: 'MNT',
    decimals: 18
  },
  // Contract addresses (update after deployment)
  CONTRACTS: {
    MOCK_USDT: '', // Deploy MockUSDT and add address
    PAYROLL: '',   // Deploy SalaryPayroll and add address
  },
  // MockUSDT has 6 decimals like real USDT
  USDT_DECIMALS: 6
};

// ============================================
// State Management
// ============================================

const AppState = {
  connected: false,
  address: null,
  chainId: null,
  isAdmin: false,
  provider: null,
  signer: null,

  // Batch payment state
  csvData: [],
  pendingBatches: [],

  // Employee state
  employees: [],
  payslips: [],
};

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', () => {
  initializeApp();
});

async function initializeApp() {
  console.log('🔐 LatticA Salary - Initializing...');
  console.log(`📍 Network: ${CONFIG.CHAIN_NAME} (Chain ID: ${CONFIG.CHAIN_ID})`);

  // Setup event listeners
  setupWalletListeners();
  setupUIListeners();

  // Check if already connected
  if (typeof window.ethereum !== 'undefined') {
    const accounts = await window.ethereum.request({ method: 'eth_accounts' });
    if (accounts.length > 0) {
      await handleAccountsChanged(accounts);
    }
  }

  // Update UI based on page
  updatePageSpecificUI();
}

// ============================================
// Wallet Connection
// ============================================

function setupWalletListeners() {
  const connectBtn = document.getElementById('connectBtn');
  const connectPromptBtn = document.getElementById('connectPromptBtn');

  if (connectBtn) {
    connectBtn.addEventListener('click', handleConnectClick);
  }

  if (connectPromptBtn) {
    connectPromptBtn.addEventListener('click', handleConnectClick);
  }

  // Listen for MetaMask events
  if (typeof window.ethereum !== 'undefined') {
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);
  }
}

async function handleConnectClick() {
  if (AppState.connected) {
    // Disconnect
    disconnectWallet();
    return;
  }

  if (typeof window.ethereum === 'undefined') {
    showToast('MetaMask not detected. Please install MetaMask.', 'error');
    return;
  }

  try {
    updateConnectButton('connecting');

    // Request accounts
    const accounts = await window.ethereum.request({
      method: 'eth_requestAccounts'
    });

    if (accounts.length > 0) {
      await handleAccountsChanged(accounts);

      // Check and switch network if needed
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });
      if (chainId !== CONFIG.CHAIN_ID_HEX) {
        await switchToMantleSepolia();
      }
    }
  } catch (error) {
    console.error('Connection error:', error);
    showToast('Failed to connect wallet', 'error');
    updateConnectButton('disconnected');
  }
}

async function handleAccountsChanged(accounts) {
  if (accounts.length === 0) {
    disconnectWallet();
    return;
  }

  AppState.connected = true;
  AppState.address = accounts[0];

  // Update UI
  updateConnectButton('connected');
  updateNetworkBadge();

  // Check admin role
  await checkAdminRole();

  // Update page-specific UI
  updatePageSpecificUI();

  showToast(`Connected: ${shortenAddress(AppState.address)}`, 'success');
}

function handleChainChanged(chainId) {
  AppState.chainId = parseInt(chainId, 16);
  updateNetworkBadge();

  if (chainId !== CONFIG.CHAIN_ID_HEX) {
    showToast(`Please switch to ${CONFIG.CHAIN_NAME}`, 'warning');
  }
}

function disconnectWallet() {
  AppState.connected = false;
  AppState.address = null;
  AppState.isAdmin = false;

  updateConnectButton('disconnected');
  updateNetworkBadge();
  updatePageSpecificUI();

  showToast('Wallet disconnected', 'info');
}

async function switchToMantleSepolia() {
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: CONFIG.CHAIN_ID_HEX }],
    });
  } catch (switchError) {
    // Chain not added, try to add it
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: 'wallet_addEthereumChain',
          params: [{
            chainId: CONFIG.CHAIN_ID_HEX,
            chainName: CONFIG.CHAIN_NAME,
            nativeCurrency: CONFIG.CURRENCY,
            rpcUrls: [CONFIG.RPC_URL],
            blockExplorerUrls: [CONFIG.EXPLORER_URL],
          }],
        });
      } catch (addError) {
        console.error('Failed to add network:', addError);
        showToast('Failed to add Mantle Sepolia network', 'error');
      }
    } else {
      console.error('Failed to switch network:', switchError);
    }
  }
}

// ============================================
// UI Updates
// ============================================

function updateConnectButton(state) {
  const btn = document.getElementById('connectBtn');
  if (!btn) return;

  const btnText = btn.querySelector('.btn-text') || btn;

  switch (state) {
    case 'connecting':
      btnText.textContent = 'Connecting...';
      btn.disabled = true;
      break;
    case 'connected':
      btnText.textContent = shortenAddress(AppState.address);
      btn.disabled = false;
      btn.classList.add('connected');
      break;
    case 'disconnected':
    default:
      btnText.textContent = 'Connect Wallet';
      btn.disabled = false;
      btn.classList.remove('connected');
      break;
  }
}

function updateNetworkBadge() {
  const badge = document.getElementById('networkBadge');
  if (!badge) return;

  const dot = badge.querySelector('.network-dot');
  const name = badge.querySelector('.network-name');

  if (!AppState.connected) {
    name.textContent = 'Not Connected';
    dot.style.background = '#64748b';
    return;
  }

  const isCorrectNetwork = AppState.chainId === CONFIG.CHAIN_ID ||
    parseInt(window.ethereum?.chainId, 16) === CONFIG.CHAIN_ID;

  if (isCorrectNetwork) {
    name.textContent = CONFIG.CHAIN_NAME;
    dot.style.background = '#10b981';
  } else {
    name.textContent = 'Wrong Network';
    dot.style.background = '#ef4444';
  }
}

function updatePageSpecificUI() {
  const page = detectCurrentPage();

  switch (page) {
    case 'admin':
      updateAdminUI();
      break;
    case 'employee':
      updateEmployeeUI();
      break;
    default:
      // Index page - no special updates needed
      break;
  }
}

function detectCurrentPage() {
  const path = window.location.pathname;
  if (path.includes('admin')) return 'admin';
  if (path.includes('employee')) return 'employee';
  return 'index';
}

// ============================================
// Admin Page Functions
// ============================================

function updateAdminUI() {
  const roleBanner = document.getElementById('roleBanner');

  if (!AppState.connected) {
    if (roleBanner) {
      roleBanner.innerHTML = `
        <span class="role-icon">⚠️</span>
        <span class="role-text">지갑을 연결하고 Admin 권한을 확인하세요</span>
      `;
      roleBanner.className = 'role-banner warning';
    }
    return;
  }

  if (AppState.isAdmin) {
    if (roleBanner) {
      roleBanner.innerHTML = `
        <span class="role-icon">✅</span>
        <span class="role-text">Admin 권한이 확인되었습니다</span>
      `;
      roleBanner.className = 'role-banner success';
    }
    enableAdminFunctions();
  } else {
    if (roleBanner) {
      roleBanner.innerHTML = `
        <span class="role-icon">❌</span>
        <span class="role-text">Admin 권한이 없습니다. 컨트랙트 소유자에게 문의하세요.</span>
      `;
      roleBanner.className = 'role-banner error';
    }
  }

  // Load data
  loadTreasuryBalance();
  loadEmployees();
  loadBatches();
}

function enableAdminFunctions() {
  const createBatchBtn = document.getElementById('createBatchBtn');
  if (createBatchBtn) {
    createBatchBtn.disabled = AppState.csvData.length === 0;
  }
}

async function checkAdminRole() {
  // TODO: Call contract to check ADMIN_ROLE
  // For demo, assume connected wallet is admin
  AppState.isAdmin = true;
}

async function loadTreasuryBalance() {
  const balanceEl = document.getElementById('treasuryBalance');
  if (!balanceEl) return;

  // TODO: Call MockUSDT.balanceOf(payrollContract)
  // For demo, show placeholder
  balanceEl.innerHTML = `
    <span class="balance-value">10,000.00</span>
    <span class="balance-unit">USDT</span>
  `;
}

async function loadEmployees() {
  // TODO: Load from contract/off-chain storage
  // For demo, show empty state
}

async function loadBatches() {
  // TODO: Load pending batches
}

// ============================================
// Employee Page Functions
// ============================================

function updateEmployeeUI() {
  const notConnectedState = document.getElementById('notConnectedState');
  const connectedState = document.getElementById('connectedState');

  if (!AppState.connected) {
    if (notConnectedState) notConnectedState.style.display = 'block';
    if (connectedState) connectedState.style.display = 'none';
    return;
  }

  if (notConnectedState) notConnectedState.style.display = 'none';
  if (connectedState) connectedState.style.display = 'block';

  // Update account info
  const myAddress = document.getElementById('myAddress');
  if (myAddress) {
    myAddress.textContent = shortenAddress(AppState.address);
  }

  // Load employee data
  loadEmployeeData();
}

async function loadEmployeeData() {
  // TODO: Load from contract
  // - Check if address is registered employee
  // - Load USDT balance
  // - Load encrypted payslips (CIDs)
  // - Load payment history from events

  // Update balance
  const balanceDisplay = document.getElementById('balanceDisplay');
  if (balanceDisplay) {
    // TODO: Call MockUSDT.balanceOf(address)
    balanceDisplay.innerHTML = `
      <span class="balance-value">4,850.00</span>
      <span class="balance-unit">USDT</span>
    `;
  }
}

// ============================================
// CSV Upload & Batch Creation
// ============================================

function setupUIListeners() {
  // Tab navigation
  setupTabNavigation();

  // Workflow tabs (index page)
  setupWorkflowTabs();

  // CSV upload
  setupCSVUpload();

  // Forms
  setupForms();

  // Modals
  setupModals();
}

function setupTabNavigation() {
  document.querySelectorAll('.main-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;

      // Update tab buttons
      document.querySelectorAll('.main-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      // Update tab content
      document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
      });

      const targetContent = document.getElementById(`${tabId}Tab`);
      if (targetContent) {
        targetContent.classList.add('active');
      }
    });
  });
}

function setupWorkflowTabs() {
  document.querySelectorAll('.workflow-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabId = tab.dataset.tab;

      document.querySelectorAll('.workflow-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');

      document.querySelectorAll('.workflow-content').forEach(content => {
        content.classList.add('hidden');
      });

      const target = document.getElementById(`${tabId}Flow`);
      if (target) {
        target.classList.remove('hidden');
      }
    });
  });
}

function setupCSVUpload() {
  const uploadZone = document.getElementById('uploadZone');
  const csvFile = document.getElementById('csvFile');
  const clearUpload = document.getElementById('clearUpload');
  const downloadTemplate = document.getElementById('downloadTemplate');

  if (uploadZone && csvFile) {
    uploadZone.addEventListener('click', () => csvFile.click());

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('dragover');

      const file = e.dataTransfer.files[0];
      if (file && file.name.endsWith('.csv')) {
        handleCSVFile(file);
      } else {
        showToast('Please upload a CSV file', 'error');
      }
    });

    csvFile.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        handleCSVFile(file);
      }
    });
  }

  if (clearUpload) {
    clearUpload.addEventListener('click', () => {
      AppState.csvData = [];
      updateCSVPreview();
      const createBatchBtn = document.getElementById('createBatchBtn');
      if (createBatchBtn) createBatchBtn.disabled = true;
    });
  }

  if (downloadTemplate) {
    downloadTemplate.addEventListener('click', (e) => {
      e.preventDefault();
      downloadCSVTemplate();
    });
  }
}

function handleCSVFile(file) {
  const reader = new FileReader();

  reader.onload = (e) => {
    const text = e.target.result;
    parseCSV(text);
  };

  reader.readAsText(file);
}

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const data = [];

  // Skip header
  for (let i = 1; i < lines.length; i++) {
    const parts = lines[i].split(',').map(p => p.trim());
    if (parts.length >= 2) {
      const address = parts[0];
      const amount = parseFloat(parts[1]);
      const memo = parts[2] || '';

      // Validate address
      if (address.startsWith('0x') && address.length === 42 && !isNaN(amount)) {
        data.push({ address, amount, memo });
      }
    }
  }

  if (data.length === 0) {
    showToast('No valid records found in CSV', 'error');
    return;
  }

  AppState.csvData = data;
  updateCSVPreview();

  const createBatchBtn = document.getElementById('createBatchBtn');
  if (createBatchBtn) createBatchBtn.disabled = false;

  showToast(`Loaded ${data.length} records`, 'success');
}

function updateCSVPreview() {
  const uploadZone = document.getElementById('uploadZone');
  const uploadPreview = document.getElementById('uploadPreview');
  const previewTable = document.getElementById('previewTable');

  if (!uploadPreview || !previewTable) return;

  if (AppState.csvData.length === 0) {
    if (uploadZone) uploadZone.style.display = 'block';
    uploadPreview.style.display = 'none';
    return;
  }

  if (uploadZone) uploadZone.style.display = 'none';
  uploadPreview.style.display = 'block';

  // Update table
  const tbody = previewTable.querySelector('tbody');
  tbody.innerHTML = AppState.csvData.map(row => `
    <tr>
      <td class="address">${shortenAddress(row.address)}</td>
      <td>${row.amount.toFixed(2)}</td>
      <td>${row.memo || '-'}</td>
    </tr>
  `).join('');

  // Update summary
  const total = AppState.csvData.reduce((sum, row) => sum + row.amount, 0);
  document.getElementById('totalAmount').textContent = total.toFixed(2);
  document.getElementById('recordCount').textContent = AppState.csvData.length;

  // Update count
  const previewCount = uploadPreview.querySelector('.preview-count');
  if (previewCount) {
    previewCount.textContent = `${AppState.csvData.length} records loaded`;
  }
}

function downloadCSVTemplate() {
  const template = `address,amount,memo
0x1234567890123456789012345678901234567890,5000.00,January 2025 Salary
0xabcdefabcdefabcdefabcdefabcdefabcdefabcd,4500.00,January 2025 Salary`;

  const blob = new Blob([template], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'payroll_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

// ============================================
// Forms
// ============================================

function setupForms() {
  // Create Batch Form
  const createBatchForm = document.getElementById('createBatchForm');
  if (createBatchForm) {
    createBatchForm.addEventListener('submit', handleCreateBatch);
  }

  // Add Employee Form
  const addEmployeeForm = document.getElementById('addEmployeeForm');
  if (addEmployeeForm) {
    addEmployeeForm.addEventListener('submit', handleAddEmployee);
  }

  // Decrypt Payslip Button
  const decryptPayslipBtn = document.getElementById('decryptPayslipBtn');
  if (decryptPayslipBtn) {
    decryptPayslipBtn.addEventListener('click', handleDecryptPayslip);
  }
}

async function handleCreateBatch(e) {
  e.preventDefault();

  if (!AppState.connected) {
    showToast('Please connect wallet first', 'warning');
    return;
  }

  if (AppState.csvData.length === 0) {
    showToast('Please upload CSV data first', 'warning');
    return;
  }

  const batchName = document.getElementById('batchName').value;
  const periodStart = document.getElementById('periodStart').value;
  const periodEnd = document.getElementById('periodEnd').value;
  const taxRate = parseFloat(document.getElementById('taxRate').value) || 0;
  const encryptPayslips = document.getElementById('encryptPayslips').checked;

  showToast('Creating batch...', 'info');

  try {
    // 1. Encrypt payslip data (if enabled)
    if (encryptPayslips) {
      showToast('Encrypting payslips with FHE16...', 'info');
      // TODO: Call FHE16 WASM to encrypt each payslip
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated
    }

    // 2. Store encrypted data off-chain
    showToast('Storing encrypted data...', 'info');
    // TODO: Store to IPFS/backend and get CID
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulated

    // 3. Create on-chain commitment
    showToast('Creating on-chain commitment...', 'info');
    // TODO: Call contract.createBatch(...)
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulated

    showToast('Batch created successfully! Status: Draft', 'success');

    // Clear form
    AppState.csvData = [];
    updateCSVPreview();
    e.target.reset();

  } catch (error) {
    console.error('Create batch error:', error);
    showToast('Failed to create batch', 'error');
  }
}

async function handleAddEmployee(e) {
  e.preventDefault();

  if (!AppState.connected) {
    showToast('Please connect wallet first', 'warning');
    return;
  }

  const address = document.getElementById('empAddress').value;
  const empId = document.getElementById('empId').value;
  const name = document.getElementById('empName').value;
  const dept = document.getElementById('empDept').value;
  const salary = parseFloat(document.getElementById('empSalary').value) || 0;

  showToast('Registering employee...', 'info');

  try {
    // 1. Encrypt PII (name, dept) with FHE16
    showToast('Encrypting personal data...', 'info');
    // TODO: Call FHE16 WASM
    await new Promise(resolve => setTimeout(resolve, 500));

    // 2. Store encrypted data off-chain
    // TODO: Store to IPFS/backend
    await new Promise(resolve => setTimeout(resolve, 500));

    // 3. Register on-chain (only empId and address, no PII)
    showToast('Creating on-chain record...', 'info');
    // TODO: Call contract.registerEmployee(empId, address, commitmentHash)
    await new Promise(resolve => setTimeout(resolve, 1000));

    showToast('Employee registered successfully!', 'success');
    e.target.reset();

  } catch (error) {
    console.error('Add employee error:', error);
    showToast('Failed to register employee', 'error');
  }
}

async function handleDecryptPayslip() {
  const select = document.getElementById('payslipSelect');
  if (!select || !select.value) {
    showToast('Please select a payslip', 'warning');
    return;
  }

  showToast('Decrypting payslip...', 'info');

  try {
    // TODO:
    // 1. Fetch encrypted payslip from off-chain storage
    // 2. Decrypt using FHE16 WASM
    // 3. Display result

    await new Promise(resolve => setTimeout(resolve, 1500));

    // Show decrypted result (demo data)
    const result = document.getElementById('decryptedResult');
    if (result) {
      result.style.display = 'block';
      document.getElementById('resultPeriod').textContent = 'January 2025';
      document.getElementById('detailBase').textContent = '5,000.00 USDT';
      document.getElementById('detailTax').textContent = '-165.00 USDT';
      document.getElementById('detailOther').textContent = '-0.00 USDT';
      document.getElementById('detailNet').textContent = '4,835.00 USDT';
    }

    showToast('Payslip decrypted!', 'success');

  } catch (error) {
    console.error('Decrypt error:', error);
    showToast('Failed to decrypt payslip', 'error');
  }
}

// ============================================
// Modals
// ============================================

function setupModals() {
  // Close modal on overlay click
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
      overlay.closest('.modal').classList.remove('active');
    });
  });

  // Close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      btn.closest('.modal').classList.remove('active');
    });
  });
}

function showModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function hideModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// ============================================
// Utilities
// ============================================

function shortenAddress(address) {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatUSDT(amount) {
  return new Intl.NumberFormat('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(amount);
}

function showToast(message, type = 'info') {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${getToastIcon(type)}</span>
    <span class="toast-message">${message}</span>
  `;

  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    toast.classList.add('show');
  });

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

function getToastIcon(type) {
  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ'
  };
  return icons[type] || icons.info;
}

// ============================================
// Dynamic Styles
// ============================================

const dynamicStyles = document.createElement('style');
dynamicStyles.textContent = `
  .toast {
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    background: var(--dark-lighter, #1e293b);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem 1.5rem;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    transform: translateY(100px);
    opacity: 0;
    transition: all 0.3s ease;
    z-index: 10000;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
    color: white;
  }

  .toast.show {
    transform: translateY(0);
    opacity: 1;
  }

  .toast-icon {
    width: 24px;
    height: 24px;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.85rem;
  }

  .toast-info .toast-icon { background: rgba(99, 102, 241, 0.2); color: #818cf8; }
  .toast-success .toast-icon { background: rgba(16, 185, 129, 0.2); color: #34d399; }
  .toast-error .toast-icon { background: rgba(239, 68, 68, 0.2); color: #f87171; }
  .toast-warning .toast-icon { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }

  .connect-btn.connected {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  }

  .network-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #64748b;
  }

  .role-banner {
    padding: 1rem 1.5rem;
    border-radius: 12px;
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 2rem;
  }

  .role-banner.warning {
    background: rgba(245, 158, 11, 0.1);
    border: 1px solid rgba(245, 158, 11, 0.3);
    color: #fbbf24;
  }

  .role-banner.success {
    background: rgba(16, 185, 129, 0.1);
    border: 1px solid rgba(16, 185, 129, 0.3);
    color: #34d399;
  }

  .role-banner.error {
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.3);
    color: #f87171;
  }

  .upload-zone.dragover {
    border-color: var(--primary, #6366f1);
    background: rgba(99, 102, 241, 0.1);
  }

  .modal {
    display: none;
    position: fixed;
    inset: 0;
    z-index: 9999;
    align-items: center;
    justify-content: center;
  }

  .modal.active {
    display: flex;
  }

  .modal-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.7);
    backdrop-filter: blur(4px);
  }

  .modal-content {
    position: relative;
    background: var(--dark-lighter, #1e293b);
    border-radius: 20px;
    max-width: 600px;
    width: 90%;
    max-height: 90vh;
    overflow: auto;
  }

  .modal-content.modal-lg {
    max-width: 800px;
  }

  .modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 1.5rem;
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .modal-close {
    background: none;
    border: none;
    color: white;
    font-size: 1.5rem;
    cursor: pointer;
    opacity: 0.7;
  }

  .modal-close:hover {
    opacity: 1;
  }

  .modal-body {
    padding: 1.5rem;
  }

  .modal-footer {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    padding: 1.5rem;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
  }

  .hidden {
    display: none !important;
  }

  .tab-content {
    display: none;
  }

  .tab-content.active {
    display: block;
  }
`;

document.head.appendChild(dynamicStyles);

// ============================================
// Console Info
// ============================================

console.log('🔐 LatticA Salary Frontend Loaded');
console.log('📍 Network: Mantle Sepolia (Chain ID: 5003)');
console.log('💵 Token: MockUSDT (6 decimals)');
console.log('🔒 Privacy: FHE16 encrypted payslips (off-chain)');
console.log('⛓️ On-chain: Commitment hash only (no PII)');
