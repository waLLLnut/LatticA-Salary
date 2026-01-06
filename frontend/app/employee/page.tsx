"use client";

import Link from "next/link";
import { useState, useCallback } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useFHE } from "@/hooks/useFHE";
import { formatUSDT, MANTLE_SEPOLIA } from "@/lib/wallet";

export default function EmployeePage() {
  const [selectedPayslip, setSelectedPayslip] = useState<string>('');
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedData, setDecryptedData] = useState<{
    baseSalary: string;
    tax: string;
    deductions: string;
    net: string;
    period: string;
  } | null>(null);

  const wallet = useWallet();
  const fhe = useFHE();

  // Demo decrypt function (in production, this would use FHE decryption)
  const handleDecrypt = useCallback(async () => {
    if (!selectedPayslip || !wallet.connected) return;

    setIsDecrypting(true);

    try {
      // Initialize FHE
      await fhe.initialize();

      // Simulate decryption delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Demo data (in production, this would come from FHE decryption)
      setDecryptedData({
        baseSalary: '5,000.00 USDT',
        tax: '165.00 USDT',
        deductions: '0.00 USDT',
        net: '4,835.00 USDT',
        period: 'January 2025',
      });

    } catch (err: any) {
      console.error('Decrypt error:', err);
      alert(`Failed to decrypt: ${err.message}`);
    } finally {
      setIsDecrypting(false);
    }
  }, [selectedPayslip, wallet.connected, fhe]);

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
            <Link href="/admin" className="text-[var(--gray)] hover:text-white transition-colors">Admin</Link>
            <Link href="/employee" className="text-white font-medium">Employee</Link>
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
        <div className="mb-8 md:mb-12">
          <h1 className="text-2xl md:text-4xl font-bold mb-2">&#x1F464; Employee Portal</h1>
          <p className="text-[var(--gray)] text-sm md:text-base">View salary information and download payslips</p>
        </div>

        {/* Not Connected State */}
        {!wallet.connected && (
          <div className="min-h-[300px] md:min-h-[400px] flex items-center justify-center">
            <div className="text-center p-8 md:p-12 bg-[var(--dark-lighter)] border border-white/10 rounded-2xl md:rounded-3xl max-w-[400px]">
              <div className="text-5xl md:text-6xl mb-4 md:mb-6">&#x1F517;</div>
              <h2 className="text-xl md:text-2xl font-bold mb-3">Connect Your Wallet</h2>
              <p className="text-[var(--gray)] mb-6 md:mb-8 text-sm md:text-base">Connect with your registered wallet to view salary information.</p>
              <button
                onClick={wallet.connect}
                disabled={wallet.isLoading}
                className="flex items-center gap-2 px-6 md:px-8 py-3 md:py-4 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-xl text-sm md:text-base font-semibold mx-auto hover:shadow-lg hover:shadow-indigo-500/30 transition-all disabled:opacity-50"
              >
                <span>&#x1F45B;</span> {wallet.isLoading ? 'Connecting...' : 'Connect Wallet'}
              </button>
              {!wallet.hasMetaMask && (
                <p className="text-xs text-amber-400 mt-4">MetaMask not detected. Please install MetaMask.</p>
              )}
            </div>
          </div>
        )}

        {/* Connected State */}
        {wallet.connected && (
          <>
            {/* Balance Card */}
            <div className="bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-2xl md:rounded-3xl p-6 md:p-10 mb-6 md:mb-8 relative overflow-hidden">
              <div className="absolute -top-1/2 -right-1/5 w-[400px] h-[400px] bg-white/10 rounded-full" />
              <div className="relative z-10">
                <div className="flex flex-col sm:flex-row justify-between items-start gap-2 mb-4">
                  <div>
                    <span className="text-base md:text-lg opacity-90">My USDT Balance</span>
                    <span className="ml-2 md:ml-3 px-2 md:px-3 py-1 bg-amber-500/30 text-amber-300 rounded-full text-xs">On-chain (Public)</span>
                  </div>
                  <button className="px-3 md:px-4 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-all">
                    &#x1F504;
                  </button>
                </div>
                <div className="text-3xl md:text-5xl font-bold mb-4 md:mb-6">
                  <span>{formatUSDT(wallet.usdtBalance)}</span>
                  <span className="text-xl md:text-2xl opacity-70 ml-2 md:ml-3">USDT</span>
                </div>
                <div className="flex items-center gap-2 text-xs md:text-sm opacity-80">
                  <span>&#x2139;&#xFE0F;</span>
                  <span>USDT balance is public due to blockchain nature</span>
                </div>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className="bg-[var(--dark-lighter)] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 mb-6 md:mb-8">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                <span className="text-lg md:text-xl">&#x1F512;</span>
                <span className="font-semibold text-sm md:text-base">Privacy Protection Status</span>
              </div>
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm">
                  <span className="text-emerald-400 font-medium min-w-[120px]">&#x2705; Protected</span>
                  <span className="text-[var(--gray)]">Payslips, tax calculation details, personal info</span>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 text-sm">
                  <span className="text-amber-400 font-medium min-w-[120px]">&#x1F310; Public</span>
                  <span className="text-[var(--gray)]">USDT received amounts, transaction hashes</span>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6 mb-6 md:mb-8">
              {[
                { icon: '&#x1F4C5;', value: '0', label: 'Payments Received' },
                { icon: '&#x1F4CA;', value: '0', label: 'Total Received (USDT)' },
                { icon: '&#x1F510;', value: '0', label: 'Encrypted Payslips' },
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

            {/* Main Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Payslips */}
              <div className="bg-[var(--dark-lighter)] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-7">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4 md:mb-6">
                  <h2 className="text-lg md:text-xl font-semibold">&#x1F510; My Payslips</h2>
                  <span className="px-3 py-1 bg-[var(--primary)]/20 text-[var(--primary)] rounded-full text-xs font-semibold">FHE Encrypted</span>
                </div>
                <div className="text-center py-8 md:py-12 text-[var(--gray)]">
                  <span className="text-3xl md:text-4xl block mb-3">&#x1F4ED;</span>
                  <p className="text-sm md:text-base">No payslips yet</p>
                </div>
              </div>

              {/* Decrypt & View */}
              <div className="bg-[var(--dark-lighter)] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-7">
                <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6">&#x1F513; Decrypt Payslip</h2>
                <div className="space-y-4 md:space-y-5">
                  <div>
                    <p className="text-[var(--gray)] mb-2 text-sm md:text-base">Click the button below to decrypt your payslip.</p>
                    <p className="text-xs md:text-sm text-[var(--gray)] opacity-70">Only your wallet key can decrypt this.</p>
                  </div>
                  <div>
                    <label className="block font-medium text-sm mb-2">Select Payslip</label>
                    <select
                      value={selectedPayslip}
                      onChange={(e) => setSelectedPayslip(e.target.value)}
                      disabled
                      className="w-full bg-[var(--dark)] border border-white/15 rounded-xl px-4 py-3 disabled:opacity-50"
                    >
                      <option value="">-- Select a payslip --</option>
                    </select>
                  </div>
                  <button
                    onClick={handleDecrypt}
                    disabled={!selectedPayslip || isDecrypting}
                    className="w-full py-4 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-lg hover:shadow-indigo-500/30 transition-all"
                  >
                    {isDecrypting ? (
                      <>&#x23F3; Decrypting...</>
                    ) : (
                      <>&#x1F513; Decrypt Selected Payslip</>
                    )}
                  </button>
                  {fhe.isLoading && (
                    <p className="text-xs text-[var(--primary)] text-center">Loading FHE module...</p>
                  )}
                </div>

                {/* Decrypted Result */}
                {decryptedData && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex justify-between items-center mb-5">
                      <h3 className="font-semibold">&#x1F4C4; Payslip Details</h3>
                      <span className="text-sm text-[var(--gray)]">{decryptedData.period}</span>
                    </div>
                    <div className="bg-[var(--dark)] rounded-xl p-4 space-y-3 mb-4">
                      <div className="flex justify-between py-2">
                        <span className="text-[var(--gray)]">Base Salary</span>
                        <span className="font-mono font-medium">{decryptedData.baseSalary}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-[var(--gray)]">Tax Deduction</span>
                        <span className="font-mono text-red-400">-{decryptedData.tax}</span>
                      </div>
                      <div className="flex justify-between py-2">
                        <span className="text-[var(--gray)]">Other Deductions</span>
                        <span className="font-mono text-red-400">-{decryptedData.deductions}</span>
                      </div>
                      <div className="h-px bg-white/10 my-2" />
                      <div className="flex justify-between py-2 font-semibold">
                        <span className="text-[var(--gray)]">Net Amount</span>
                        <span className="font-mono text-emerald-400 text-lg">{decryptedData.net}</span>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button className="flex-1 py-3 bg-white/10 rounded-xl font-medium text-sm hover:bg-white/20 transition-all">
                        <span>&#x1F4E5;</span> Download PDF
                      </button>
                      <button className="flex-1 py-3 bg-white/10 border-2 border-white/20 rounded-xl font-medium text-sm hover:border-[var(--primary)] transition-all">
                        <span>&#x1F517;</span> Verify On-chain
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Payment History */}
              <div className="lg:col-span-2 bg-[var(--dark-lighter)] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-7">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 md:mb-6">
                  <h2 className="text-lg md:text-xl font-semibold">&#x1F4DC; Payment History</h2>
                  <div className="flex gap-2 md:gap-3">
                    <select className="bg-[var(--dark)] border border-white/15 rounded-lg px-3 md:px-4 py-2 text-xs md:text-sm">
                      <option>All Time</option>
                      <option>Last 3 Months</option>
                      <option>Last 6 Months</option>
                      <option>This Year</option>
                    </select>
                    <button className="px-3 md:px-4 py-2 bg-white/10 rounded-lg text-xs md:text-sm hover:bg-white/20 transition-all">
                      <span>&#x1F4E5;</span> Export
                    </button>
                  </div>
                </div>
                <table className="w-full">
                  <thead>
                    <tr className="text-[var(--gray)] text-sm uppercase">
                      <th className="text-left p-4 border-b border-white/10">Date</th>
                      <th className="text-left p-4 border-b border-white/10">Period</th>
                      <th className="text-left p-4 border-b border-white/10">Amount (USDT)</th>
                      <th className="text-left p-4 border-b border-white/10">Tx Hash</th>
                      <th className="text-left p-4 border-b border-white/10">Payslip</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan={5} className="p-12">
                        <div className="text-center text-[var(--gray)]">
                          <span className="text-4xl block mb-3">&#x1F4ED;</span>
                          <p>No payment history</p>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Selective Disclosure */}
              <div className="bg-[var(--dark-lighter)] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-7">
                <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6">&#x1F441;&#xFE0F; Selective Disclosure</h2>
                <div className="space-y-4 md:space-y-5">
                  <p className="text-xs md:text-sm text-[var(--gray)]">You can disclose salary information for specific periods to auditors.</p>
                  <div>
                    <label className="block font-medium text-sm mb-2">Period to Disclose</label>
                    <select className="w-full bg-[var(--dark)] border border-white/15 rounded-xl px-3 md:px-4 py-2 md:py-3 text-sm md:text-base">
                      <option value="">-- Select period --</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-medium text-sm mb-2">Auditor Address</label>
                    <input
                      type="text"
                      placeholder="0x..."
                      className="w-full bg-[var(--dark)] border border-white/15 rounded-xl px-3 md:px-4 py-2 md:py-3 text-sm md:text-base focus:border-[var(--primary)] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-sm mb-2">Disclosure Level</label>
                    <select className="w-full bg-[var(--dark)] border border-white/15 rounded-xl px-3 md:px-4 py-2 md:py-3 text-sm md:text-base">
                      <option value="summary">Summary Only (totals)</option>
                      <option value="full">Full Details (complete breakdown)</option>
                    </select>
                  </div>
                  <button
                    disabled
                    className="w-full py-3 md:py-4 bg-white/10 rounded-xl text-sm md:text-base font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>&#x1F511;</span> Create Access Link
                  </button>
                </div>
              </div>

              {/* Account Info */}
              <div className="bg-[var(--dark-lighter)] border border-white/10 rounded-2xl md:rounded-3xl p-5 md:p-7">
                <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6">&#x1F464; My Account</h2>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-white/10">
                    <span className="text-[var(--gray)]">Wallet Address</span>
                    <span className="font-mono text-[var(--primary)]">{wallet.shortAddress}</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-white/10">
                    <span className="text-[var(--gray)]">Employee ID</span>
                    <span className="font-medium">-</span>
                  </div>
                  <div className="flex justify-between py-3 border-b border-white/10">
                    <span className="text-[var(--gray)]">Registration Date</span>
                    <span className="font-medium">-</span>
                  </div>
                  <div className="flex justify-between py-3">
                    <span className="text-[var(--gray)]">Status</span>
                    <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-semibold">Active</span>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-white/10">
                  <button className="px-4 py-2 bg-white/10 rounded-lg text-sm hover:bg-white/20 transition-all">
                    <span>&#x270F;&#xFE0F;</span> Update Receiving Address
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
