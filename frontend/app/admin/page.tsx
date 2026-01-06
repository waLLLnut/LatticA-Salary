"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useFHE } from "@/hooks/useFHE";
import { formatUSDT, MANTLE_SEPOLIA } from "@/lib/wallet";

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<'batch' | 'employees' | 'history'>('batch');
  const [csvData, setCsvData] = useState<Array<{ address: string; amount: string; memo: string }>>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [batchName, setBatchName] = useState('');
  const [periodStart, setPeriodStart] = useState('');
  const [periodEnd, setPeriodEnd] = useState('');
  const [taxRate, setTaxRate] = useState('3.3');
  const [encryptEnabled, setEncryptEnabled] = useState(true);
  const [isCreatingBatch, setIsCreatingBatch] = useState(false);

  // Employee form state
  const [empAddress, setEmpAddress] = useState('');
  const [empId, setEmpId] = useState('');
  const [empName, setEmpName] = useState('');
  const [empDept, setEmpDept] = useState('');
  const [empSalary, setEmpSalary] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const wallet = useWallet();
  const fhe = useFHE();

  const handleFileUpload = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n').filter(line => line.trim());
      const data = lines.slice(1).map(line => {
        const [address, amount, memo] = line.split(',').map(s => s.trim());
        return { address, amount, memo: memo || '' };
      }).filter(row => row.address && row.amount);
      setCsvData(data);
    };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
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
  };

  const handleCreateBatch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet.connected) {
      alert('Please connect wallet first');
      return;
    }

    if (csvData.length === 0) {
      alert('Please upload CSV data first');
      return;
    }

    setIsCreatingBatch(true);

    try {
      // 1. Initialize FHE if encryption enabled
      if (encryptEnabled) {
        console.log('🔐 Initializing FHE...');
        await fhe.initialize();

        // 2. Encrypt each payslip
        console.log('📝 Encrypting payslips...');
        const tax = parseFloat(taxRate) / 100;

        for (const row of csvData) {
          const baseSalary = parseFloat(row.amount);
          const taxAmount = baseSalary * tax;
          const netAmount = baseSalary - taxAmount;

          const encrypted = await fhe.encryptPayslipData({
            baseSalary,
            tax: taxAmount,
            otherDeductions: 0,
            netAmount,
            period: `${periodStart} ~ ${periodEnd}`,
            employeeId: row.address.slice(0, 10),
          });

          console.log(`✅ Encrypted payslip for ${row.address.slice(0, 10)}...`, encrypted.cid);
        }
      }

      // 3. TODO: Store off-chain and create on-chain commitment
      console.log('📦 Creating batch:', batchName);

      alert(`Batch "${batchName}" created successfully!\n\nStatus: Draft\nRecords: ${csvData.length}\nTotal: ${formatUSDT(totalAmount)} USDT`);

      // Clear form
      setCsvData([]);
      setBatchName('');
      setPeriodStart('');
      setPeriodEnd('');

    } catch (err: any) {
      console.error('Create batch error:', err);
      alert(`Failed to create batch: ${err.message}`);
    } finally {
      setIsCreatingBatch(false);
    }
  }, [wallet.connected, csvData, batchName, periodStart, periodEnd, taxRate, encryptEnabled, fhe]);

  const handleRegisterEmployee = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();

    if (!wallet.connected) {
      alert('Please connect wallet first');
      return;
    }

    if (!empAddress || !empId) {
      alert('Wallet address and Employee ID are required');
      return;
    }

    setIsRegistering(true);

    try {
      // 1. Initialize FHE
      console.log('🔐 Initializing FHE...');
      await fhe.initialize();

      // 2. Encrypt PII (name, dept)
      console.log('📝 Encrypting employee data...');
      const commitment = await fhe.generateCommitment(
        JSON.stringify({ empId, name: empName, dept: empDept, salary: empSalary })
      );

      console.log(`✅ Commitment generated: ${commitment.slice(0, 20)}...`);

      // 3. TODO: Register on-chain
      alert(`Employee ${empId} registered successfully!\n\nWallet: ${empAddress.slice(0, 10)}...\nCommitment: ${commitment.slice(0, 20)}...`);

      // Clear form
      setEmpAddress('');
      setEmpId('');
      setEmpName('');
      setEmpDept('');
      setEmpSalary('');

    } catch (err: any) {
      console.error('Register employee error:', err);
      alert(`Failed to register employee: ${err.message}`);
    } finally {
      setIsRegistering(false);
    }
  }, [wallet.connected, empAddress, empId, empName, empDept, empSalary, fhe]);

  const totalAmount = csvData.reduce((sum, row) => sum + parseFloat(row.amount || '0'), 0);

  return (
    <div className="min-h-screen bg-[var(--dark)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--dark)]/90 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1200px] mx-auto px-4 md:px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-xl md:text-2xl">&#x1F510;</span>
            <span className="text-lg md:text-xl font-bold bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
              LatticA Salary
            </span>
          </div>
          <nav className="hidden md:flex gap-8">
            <Link href="/" className="text-[var(--gray)] hover:text-white transition-colors">Home</Link>
            <Link href="/admin" className="text-white font-medium">Admin</Link>
            <Link href="/employee" className="text-[var(--gray)] hover:text-white transition-colors">Employee</Link>
          </nav>
          <div className="flex items-center gap-2 md:gap-4">
            <div className={`hidden sm:flex items-center gap-2 px-3 md:px-4 py-2 bg-white/10 rounded-full text-xs md:text-sm ${wallet.connected && wallet.isCorrectNetwork ? 'text-emerald-400' : ''}`}>
              <span className={`w-2 h-2 rounded-full ${wallet.connected ? (wallet.isCorrectNetwork ? 'bg-emerald-400' : 'bg-amber-400') : 'bg-red-500'}`} />
              <span>{wallet.connected ? (wallet.isCorrectNetwork ? MANTLE_SEPOLIA.name : 'Wrong Network') : 'Not Connected'}</span>
            </div>
            <button
              onClick={wallet.connected ? wallet.disconnect : wallet.connect}
              disabled={wallet.isLoading}
              className={`flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 rounded-xl text-sm md:text-base font-semibold hover:-translate-y-0.5 transition-all ${wallet.connected ? 'bg-emerald-500' : 'bg-gradient-to-r from-[#667eea] to-[#764ba2]'}`}
            >
              <span>&#x1F45B;</span>
              <span className="hidden sm:inline">
                {wallet.isLoading ? 'Connecting...' : wallet.connected ? wallet.shortAddress : 'Connect Wallet'}
              </span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-20 md:pt-24 pb-12 md:pb-16 px-4 md:px-8 max-w-[1400px] mx-auto">
        {/* Dashboard Header */}
        <div className="flex flex-col md:flex-row justify-between items-start gap-4 mb-8 md:mb-12">
          <div>
            <h1 className="text-2xl md:text-4xl font-bold mb-2">&#x1F468;&#x200D;&#x1F4BC; Admin Portal</h1>
            <p className="text-[var(--gray)] text-sm md:text-base">Payroll management and batch payments</p>
          </div>
          <button className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-white/10 border-2 border-white/20 rounded-xl text-sm md:text-base font-semibold hover:border-[var(--primary)] transition-all">
            <span>&#x1F4CA;</span> Export Report
          </button>
        </div>

        {/* Role Banner */}
        <div className={`flex items-center gap-3 px-4 md:px-6 py-3 md:py-4 rounded-xl mb-6 md:mb-8 ${
          wallet.connected
            ? wallet.isAdmin
              ? 'bg-emerald-500/10 border border-emerald-500/30'
              : 'bg-red-500/10 border border-red-500/30'
            : 'bg-amber-500/10 border border-amber-500/30'
        }`}>
          <span className="text-lg md:text-xl">
            {wallet.connected ? (wallet.isAdmin ? '&#x2705;' : '&#x274C;') : '&#x26A0;&#xFE0F;'}
          </span>
          <span className="text-[var(--light)] text-sm md:text-base">
            {wallet.connected
              ? wallet.isAdmin
                ? 'Admin privileges verified'
                : 'No admin privileges. Contact contract owner.'
              : 'Connect wallet and verify Admin privileges'}
          </span>
        </div>

        {/* Treasury Section */}
        <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-2xl md:rounded-3xl p-5 md:p-8 mb-6 md:mb-8 relative overflow-hidden">
          <div className="absolute -top-1/2 -right-1/5 w-[300px] h-[300px] bg-white/10 rounded-full" />
          <div className="relative z-10">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
              <h3 className="text-lg md:text-xl font-semibold">&#x1F4B0; Treasury Balance</h3>
              <span className="px-3 py-1 bg-white/20 rounded-full text-xs md:text-sm">MockUSDT</span>
            </div>
            <div className="text-3xl md:text-4xl font-bold mb-4 md:mb-6">
              <span>{wallet.connected ? formatUSDT(wallet.usdtBalance) : '0.00'}</span>
              <span className="text-base md:text-lg opacity-70 ml-2">USDT</span>
            </div>
            <div className="flex flex-wrap gap-3 md:gap-4">
              <button className="px-4 md:px-6 py-2 md:py-3 bg-white/20 rounded-xl text-sm md:text-base font-medium hover:bg-white/30 transition-all">
                <span>&#x2795;</span> Deposit
              </button>
              <button className="px-4 md:px-6 py-2 md:py-3 bg-white/10 border-2 border-white/20 rounded-xl text-sm md:text-base font-medium hover:bg-white/20 transition-all">
                <span>&#x2705;</span> Approve Allowance
              </button>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
          {[
            { icon: '&#x1F465;', value: '0', label: 'Registered Employees' },
            { icon: '&#x1F4E6;', value: '0', label: 'Pending Batches' },
            { icon: '&#x2705;', value: '0', label: 'Executed This Month' },
            { icon: '&#x1F4B8;', value: '0', label: 'Total Paid (USDT)' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-[var(--dark-lighter)] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 flex items-center gap-3 md:gap-5 hover:border-[var(--primary)] hover:-translate-y-1 transition-all">
              <div className="text-2xl md:text-4xl" dangerouslySetInnerHTML={{ __html: stat.icon }} />
              <div>
                <div className="text-xl md:text-3xl font-bold">{stat.value}</div>
                <div className="text-xs md:text-sm text-[var(--gray)]">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 md:gap-2 bg-[var(--dark-lighter)] p-1 md:p-2 rounded-xl md:rounded-2xl w-full md:w-fit mb-6 md:mb-8 overflow-x-auto">
          {[
            { id: 'batch', label: 'Batch Payment' },
            { id: 'employees', label: 'Employees' },
            { id: 'history', label: 'History' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as typeof activeTab)}
              className={`px-4 md:px-6 py-2 md:py-3 rounded-lg md:rounded-xl text-sm md:text-base font-medium transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white' : 'text-[var(--gray)] hover:text-white'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Batch Payment Tab */}
        {activeTab === 'batch' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
            {/* CSV Upload */}
            <div className="bg-[var(--dark-lighter)] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-7">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-semibold">&#x1F4E4; CSV Upload</h2>
                <button onClick={downloadTemplate} className="text-[var(--primary)] text-sm hover:underline">Download Template</button>
              </div>
              <div
                className={`border-2 border-dashed rounded-xl md:rounded-2xl p-8 md:p-12 text-center cursor-pointer transition-all ${isDragOver ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-white/20 hover:border-[var(--primary)]'}`}
                onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragOver(false);
                  const file = e.dataTransfer.files[0];
                  if (file) handleFileUpload(file);
                }}
                onClick={() => document.getElementById('csvInput')?.click()}
              >
                <input
                  type="file"
                  id="csvInput"
                  accept=".csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload(file);
                  }}
                />
                <div className="text-3xl md:text-4xl mb-3 md:mb-4">&#x1F4C1;</div>
                <p className="text-[var(--gray)] mb-2 text-sm md:text-base">Drag and drop CSV file or click to upload</p>
                <p className="text-xs text-[var(--gray)] opacity-70">Format: address, amount, memo</p>
              </div>

              {csvData.length > 0 && (
                <div className="mt-6">
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-[var(--primary)] font-medium">{csvData.length} records loaded</span>
                    <button onClick={() => setCsvData([])} className="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-all">
                      Clear
                    </button>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto mb-4">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[var(--gray)]">
                          <th className="text-left p-2">Address</th>
                          <th className="text-left p-2">Amount</th>
                          <th className="text-left p-2">Memo</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.map((row, idx) => (
                          <tr key={idx} className="border-t border-white/10">
                            <td className="p-2 font-mono text-[var(--primary)]">{row.address.slice(0, 10)}...</td>
                            <td className="p-2">{row.amount}</td>
                            <td className="p-2 text-[var(--gray)]">{row.memo}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex justify-between p-4 bg-[var(--primary)]/10 rounded-xl">
                    <span>Total: <strong>{totalAmount.toFixed(2)}</strong> USDT</span>
                    <span>Records: <strong>{csvData.length}</strong></span>
                  </div>
                </div>
              )}
            </div>

            {/* Create Batch */}
            <div className="bg-[var(--dark-lighter)] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6">&#x1F4DD; Create Batch</h2>
              <form onSubmit={handleCreateBatch} className="space-y-4 md:space-y-5">
                <div>
                  <label className="block font-medium mb-2 text-sm md:text-base">Pay Period</label>
                  <div className="flex flex-col sm:flex-row items-center gap-2 md:gap-3">
                    <input
                      type="date"
                      value={periodStart}
                      onChange={(e) => setPeriodStart(e.target.value)}
                      className="w-full sm:flex-1 bg-[var(--dark)] border border-white/15 rounded-xl px-3 md:px-4 py-2 md:py-3 text-sm md:text-base focus:border-[var(--primary)] outline-none"
                    />
                    <span className="hidden sm:block">~</span>
                    <input
                      type="date"
                      value={periodEnd}
                      onChange={(e) => setPeriodEnd(e.target.value)}
                      className="w-full sm:flex-1 bg-[var(--dark)] border border-white/15 rounded-xl px-3 md:px-4 py-2 md:py-3 text-sm md:text-base focus:border-[var(--primary)] outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-2 text-sm md:text-base">Batch Name</label>
                  <input
                    type="text"
                    value={batchName}
                    onChange={(e) => setBatchName(e.target.value)}
                    placeholder="January 2025 Salary"
                    className="w-full bg-[var(--dark)] border border-white/15 rounded-xl px-3 md:px-4 py-2 md:py-3 text-sm md:text-base focus:border-[var(--primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2 text-sm md:text-base">Tax Rate (%)</label>
                  <input
                    type="number"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                    step="0.1"
                    className="w-full bg-[var(--dark)] border border-white/15 rounded-xl px-3 md:px-4 py-2 md:py-3 text-sm md:text-base focus:border-[var(--primary)] outline-none"
                  />
                  <p className="text-xs text-[var(--gray)] mt-2">Tax records are encrypted and stored off-chain</p>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="encrypt"
                    checked={encryptEnabled}
                    onChange={(e) => setEncryptEnabled(e.target.checked)}
                    className="w-4 h-4 md:w-5 md:h-5 rounded"
                  />
                  <label htmlFor="encrypt" className="font-medium text-sm md:text-base">Encrypt Payslips (FHE16)</label>
                  {fhe.isLoading && <span className="text-xs text-[var(--primary)]">Loading...</span>}
                </div>
                <button
                  type="submit"
                  disabled={csvData.length === 0 || isCreatingBatch || !wallet.connected}
                  className="w-full py-3 md:py-4 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-xl text-sm md:text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                >
                  {isCreatingBatch ? (
                    <>&#x23F3; Creating...</>
                  ) : (
                    <>&#x1F4E6; Create Draft Batch</>
                  )}
                </button>
              </form>
            </div>

            {/* Pending Batches */}
            <div className="lg:col-span-2 bg-[var(--dark-lighter)] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-7">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-semibold">&#x23F3; Pending Batches</h2>
                <select className="bg-[var(--dark)] border border-white/15 rounded-lg px-3 md:px-4 py-2 text-sm md:text-base">
                  <option>All Status</option>
                  <option>Draft</option>
                  <option>Pending Approval</option>
                  <option>Approved</option>
                </select>
              </div>
              <div className="text-center py-8 md:py-12 text-[var(--gray)]">
                <span className="text-3xl md:text-4xl block mb-3">&#x1F4ED;</span>
                <p className="text-sm md:text-base">No pending batches</p>
              </div>
            </div>
          </div>
        )}

        {/* Employees Tab */}
        {activeTab === 'employees' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Add Employee */}
            <div className="bg-[var(--dark-lighter)] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-7">
              <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6">&#x2795; Register Employee</h2>
              <form onSubmit={handleRegisterEmployee} className="space-y-4 md:space-y-5">
                <div>
                  <label className="block font-medium mb-2 text-sm md:text-base">Wallet Address *</label>
                  <input
                    type="text"
                    value={empAddress}
                    onChange={(e) => setEmpAddress(e.target.value)}
                    placeholder="0x..."
                    className="w-full bg-[var(--dark)] border border-white/15 rounded-xl px-3 md:px-4 py-2 md:py-3 text-sm md:text-base focus:border-[var(--primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2 text-sm md:text-base">Employee ID *</label>
                  <input
                    type="text"
                    value={empId}
                    onChange={(e) => setEmpId(e.target.value)}
                    placeholder="EMP-001"
                    className="w-full bg-[var(--dark)] border border-white/15 rounded-xl px-3 md:px-4 py-2 md:py-3 text-sm md:text-base focus:border-[var(--primary)] outline-none"
                  />
                  <p className="text-xs text-[var(--gray)] mt-2">Only this ID is recorded on-chain (PII protection)</p>
                </div>
                <div>
                  <label className="block font-medium mb-2 text-sm md:text-base">Name (Off-chain only)</label>
                  <input
                    type="text"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    placeholder="John Doe"
                    className="w-full bg-[var(--dark)] border border-white/15 rounded-xl px-3 md:px-4 py-2 md:py-3 text-sm md:text-base focus:border-[var(--primary)] outline-none"
                  />
                  <p className="text-xs text-[var(--gray)] mt-2">Name is encrypted and stored only off-chain</p>
                </div>
                <div>
                  <label className="block font-medium mb-2 text-sm md:text-base">Department (Off-chain only)</label>
                  <input
                    type="text"
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                    placeholder="Engineering"
                    className="w-full bg-[var(--dark)] border border-white/15 rounded-xl px-3 md:px-4 py-2 md:py-3 text-sm md:text-base focus:border-[var(--primary)] outline-none"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-2 text-sm md:text-base">Base Salary (USDT)</label>
                  <input
                    type="number"
                    value={empSalary}
                    onChange={(e) => setEmpSalary(e.target.value)}
                    placeholder="5000"
                    className="w-full bg-[var(--dark)] border border-white/15 rounded-xl px-3 md:px-4 py-2 md:py-3 text-sm md:text-base focus:border-[var(--primary)] outline-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isRegistering || !wallet.connected}
                  className="w-full py-3 md:py-4 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-xl text-sm md:text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                >
                  {isRegistering ? (
                    <>&#x23F3; Registering...</>
                  ) : (
                    <>&#x1F510; Register (Encrypt & Commit)</>
                  )}
                </button>
              </form>
            </div>

            {/* Employee List */}
            <div className="lg:col-span-2 bg-[var(--dark-lighter)] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-7">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-semibold">&#x1F4CB; Employee Registry</h2>
                <input
                  type="search"
                  placeholder="Search by ID or Address..."
                  className="bg-[var(--dark)] border border-white/15 rounded-lg px-3 md:px-4 py-2 text-sm w-full sm:w-[200px]"
                />
              </div>
              <table className="w-full">
                <thead>
                  <tr className="text-[var(--gray)] text-sm uppercase">
                    <th className="text-left p-4 border-b border-white/10">Employee ID</th>
                    <th className="text-left p-4 border-b border-white/10">Address</th>
                    <th className="text-left p-4 border-b border-white/10">Commitment</th>
                    <th className="text-left p-4 border-b border-white/10">Status</th>
                    <th className="text-left p-4 border-b border-white/10">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colSpan={5} className="p-12">
                      <div className="text-center text-[var(--gray)]">
                        <span className="text-4xl block mb-3">&#x1F465;</span>
                        <p>No employees registered</p>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
              <div className="flex justify-between items-center pt-4 border-t border-white/10 mt-4 text-sm text-[var(--gray)]">
                <span>0 employees</span>
                <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all">
                  <span>&#x1F4E5;</span> Export CSV
                </button>
              </div>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="bg-[var(--dark-lighter)] border border-white/10 rounded-3xl p-7">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold">&#x1F4DC; Transaction History</h2>
              <div className="flex gap-3">
                <select className="bg-[var(--dark)] border border-white/15 rounded-lg px-4 py-2">
                  <option>All Time</option>
                  <option>This Month</option>
                  <option>This Quarter</option>
                  <option>This Year</option>
                </select>
                <button className="px-4 py-2 bg-white/10 rounded-lg hover:bg-white/20 transition-all">
                  <span>&#x1F4E5;</span> Export CSV
                </button>
              </div>
            </div>
            <table className="w-full">
              <thead>
                <tr className="text-[var(--gray)] text-sm uppercase">
                  <th className="text-left p-4 border-b border-white/10">Date</th>
                  <th className="text-left p-4 border-b border-white/10">Batch Name</th>
                  <th className="text-left p-4 border-b border-white/10">Recipients</th>
                  <th className="text-left p-4 border-b border-white/10">Total (USDT)</th>
                  <th className="text-left p-4 border-b border-white/10">Tx Hash</th>
                  <th className="text-left p-4 border-b border-white/10">Status</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan={6} className="p-12">
                    <div className="text-center text-[var(--gray)]">
                      <span className="text-4xl block mb-3">&#x1F4ED;</span>
                      <p>No transaction history</p>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
