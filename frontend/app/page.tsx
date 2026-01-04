"use client";

import Link from "next/link";
import { useState } from "react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<'admin' | 'employee'>('admin');

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
          <nav className="flex gap-4 md:gap-8">
            <Link href="/" className="text-white font-medium text-sm md:text-base">Home</Link>
            <Link href="/admin" className="text-[var(--gray)] hover:text-white transition-colors text-sm md:text-base">Admin</Link>
            <Link href="/employee" className="text-[var(--gray)] hover:text-white transition-colors text-sm md:text-base">Employee</Link>
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center relative pt-24 md:pt-32 pb-12 md:pb-16 px-4 md:px-8 overflow-hidden">
        {/* Background shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute w-[600px] h-[600px] bg-[var(--primary)] rounded-full blur-[80px] opacity-50 -top-[200px] -right-[200px] animate-float" />
          <div className="absolute w-[400px] h-[400px] bg-amber-500 rounded-full blur-[80px] opacity-50 -bottom-[100px] -left-[100px] animate-float" style={{ animationDelay: '-5s' }} />
          <div className="absolute w-[300px] h-[300px] bg-[var(--secondary)] rounded-full blur-[80px] opacity-50 top-1/2 left-1/2 animate-float" style={{ animationDelay: '-10s' }} />
        </div>

        <div className="relative z-10 text-center max-w-[900px]">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-[var(--primary)]/20 border border-[var(--primary)]/30 rounded-full text-sm mb-6">
            <span>&#x1F3C6;</span> Built for Mantle Hackathon
          </div>

          <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight mb-6">
            <span className="gradient-text">Privacy-First</span> Payroll
            <br />Powered by FHE
          </h1>

          <p className="text-lg md:text-xl text-[var(--gray)] mb-6 leading-relaxed">
            Protect payslip data and salary calculations with Fully Homomorphic Encryption (FHE)
            <br />
            <strong className="text-white">On-chain commitment + Off-chain encrypted storage</strong>
          </p>

          <div className="flex items-center gap-3 px-4 md:px-6 py-4 bg-amber-500/10 border border-amber-500/30 rounded-xl mb-8 max-w-[600px] mx-auto text-left">
            <span className="text-xl">&#x2139;&#xFE0F;</span>
            <span className="text-sm text-[var(--light)]">
              Actual payments are made in USDT and amounts are public. Privacy applies to payslip details and calculation basis.
            </span>
          </div>

          <div className="flex gap-4 md:gap-6 justify-center flex-wrap">
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 rounded-2xl text-base md:text-lg font-semibold bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-lg shadow-indigo-500/30 hover:-translate-y-1 hover:shadow-xl transition-all"
            >
              <span>&#x1F468;&#x200D;&#x1F4BC;</span> Admin Portal
            </Link>
            <Link
              href="/employee"
              className="inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 rounded-2xl text-base md:text-lg font-semibold bg-white/10 text-white border-2 border-white/20 hover:bg-white/20 hover:-translate-y-1 transition-all"
            >
              <span>&#x1F464;</span> Employee Portal
            </Link>
          </div>
        </div>
      </section>

      {/* What We Protect Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-[var(--dark-lighter)]">
        <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-16 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          What We Protect
        </h2>
        <div className="grid md:grid-cols-2 gap-6 md:gap-8 max-w-[900px] mx-auto">
          <div className="bg-[var(--dark)] rounded-2xl md:rounded-3xl p-6 md:p-8 border-2 border-emerald-500/30">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <span className="text-2xl">&#x1F512;</span>
              <span className="font-semibold text-emerald-400">Protected (FHE Encrypted)</span>
            </div>
            <ul className="space-y-3 text-[var(--gray)]">
              <li className="flex items-center gap-2"><span className="text-[var(--primary)]">•</span> Payslip details (salary breakdown)</li>
              <li className="flex items-center gap-2"><span className="text-[var(--primary)]">•</span> Tax/deduction calculation basis</li>
              <li className="flex items-center gap-2"><span className="text-[var(--primary)]">•</span> Personal salary history</li>
              <li className="flex items-center gap-2"><span className="text-[var(--primary)]">•</span> Performance bonus details</li>
              <li className="flex items-center gap-2"><span className="text-[var(--primary)]">•</span> Employee PII (name, department)</li>
            </ul>
          </div>
          <div className="bg-[var(--dark)] rounded-3xl p-8 border-2 border-amber-500/30">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
              <span className="text-2xl">&#x1F310;</span>
              <span className="font-semibold text-amber-400">Public (On-chain)</span>
            </div>
            <ul className="space-y-3 text-[var(--gray)]">
              <li className="flex items-center gap-2"><span className="text-[var(--primary)]">•</span> USDT transfer amounts (blockchain nature)</li>
              <li className="flex items-center gap-2"><span className="text-[var(--primary)]">•</span> Payment transaction hashes</li>
              <li className="flex items-center gap-2"><span className="text-[var(--primary)]">•</span> Batch execution records</li>
              <li className="flex items-center gap-2"><span className="text-[var(--primary)]">•</span> Contract events</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Architecture Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 max-w-[1200px] mx-auto">
        <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-16 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          System Architecture
        </h2>
        <div className="bg-[var(--dark-lighter)] rounded-2xl md:rounded-3xl p-6 md:p-12 border border-white/10">
          <div className="flex flex-col md:flex-row items-center justify-center gap-4 flex-wrap mb-8">
            {[
              { icon: '&#x1F4DD;', label: 'Payslip Data', desc: 'Original payslip data' },
              { icon: '&#x1F510;', label: 'FHE16 Encrypt', desc: 'Encrypted in browser', highlight: true },
              { icon: '&#x2601;&#xFE0F;', label: 'Off-chain Storage', desc: 'Store encrypted JSON' },
              { icon: '&#x26D3;&#xFE0F;', label: 'On-chain Commit', desc: 'Record hash(CID)' },
            ].map((step, idx) => (
              <div key={idx} className="flex flex-col md:flex-row items-center gap-4">
                <div className={`bg-[var(--dark)] border rounded-xl md:rounded-2xl p-4 md:p-6 text-center min-w-[120px] md:min-w-[150px] ${step.highlight ? 'border-[var(--primary)] bg-[var(--primary)]/10' : 'border-white/10'}`}>
                  <div className="text-2xl md:text-3xl mb-2 md:mb-3" dangerouslySetInnerHTML={{ __html: step.icon }} />
                  <div className="font-semibold mb-1 text-sm md:text-base">{step.label}</div>
                  <div className="text-xs text-[var(--gray)]">{step.desc}</div>
                </div>
                {idx < 3 && <span className="text-2xl text-[var(--primary)] rotate-90 md:rotate-0">→</span>}
              </div>
            ))}
          </div>
          <div className="text-center p-4 bg-[var(--primary)]/10 rounded-xl text-sm text-[var(--light)]">
            <strong>Key Point:</strong> Only commitment stored on-chain. Encrypted payroll data kept off-chain.
            Personal information (PII) is never stored on-chain.
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 max-w-[1200px] mx-auto">
        <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-16 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          Core Features
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8">
          {[
            { icon: '&#x1F512;', title: 'Encrypted Payslips', desc: 'Payslips encrypted with FHE16. Only the employee can decrypt.', tag: 'Privacy' },
            { icon: '&#x1F4B5;', title: 'USDT Batch Payment', desc: 'Bulk payments via CSV upload. MockUSDT(Testnet) / Real USDT(Mainnet)', tag: 'Payment' },
            { icon: '&#x1F441;&#xFE0F;', title: 'Selective Disclosure', desc: 'Employee: full details / Company: totals only / Auditor: specific periods', tag: 'Compliance' },
            { icon: '&#x2705;', title: 'Multi-sig Approval', desc: 'Draft → Pending Approval → Executed workflow', tag: 'Security' },
            { icon: '&#x1F4CA;', title: 'Compliance Reports', desc: 'Monthly payment/tax/deduction reports. CSV download supported.', tag: 'Accounting' },
            { icon: '&#x1F517;', title: 'On-chain Commitment', desc: 'Integrity guaranteed via hash(CID || period || employeeId) record', tag: 'Integrity' },
          ].map((feature, idx) => (
            <div key={idx} className="bg-[var(--dark-lighter)] border border-white/10 rounded-2xl md:rounded-3xl p-6 md:p-10 hover:-translate-y-2 hover:border-[var(--primary)] hover:shadow-lg hover:shadow-indigo-500/20 transition-all">
              <div className="text-3xl md:text-4xl mb-4 md:mb-6" dangerouslySetInnerHTML={{ __html: feature.icon }} />
              <h3 className="text-lg md:text-xl font-semibold mb-3 md:mb-4">{feature.title}</h3>
              <p className="text-[var(--gray)] leading-relaxed mb-4">{feature.desc}</p>
              <span className="inline-block px-3 py-1 bg-[var(--primary)]/20 text-[var(--primary)] rounded-full text-xs font-semibold">
                {feature.tag}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 md:py-24 px-4 md:px-8 bg-[var(--dark-lighter)]">
        <h2 className="text-2xl md:text-4xl font-bold text-center mb-8 md:mb-12 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          Workflow
        </h2>

        <div className="flex justify-center gap-3 md:gap-4 mb-8 md:mb-12">
          <button
            onClick={() => setActiveTab('admin')}
            className={`px-5 md:px-8 py-2 md:py-3 rounded-full text-sm md:text-base font-semibold transition-all ${activeTab === 'admin' ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white' : 'border-2 border-white/20 text-[var(--gray)] hover:border-[var(--primary)] hover:text-white'}`}
          >
            Admin Flow
          </button>
          <button
            onClick={() => setActiveTab('employee')}
            className={`px-5 md:px-8 py-2 md:py-3 rounded-full text-sm md:text-base font-semibold transition-all ${activeTab === 'employee' ? 'bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white' : 'border-2 border-white/20 text-[var(--gray)] hover:border-[var(--primary)] hover:text-white'}`}
          >
            Employee Flow
          </button>
        </div>

        <div className="max-w-[1000px] mx-auto">
          {activeTab === 'admin' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { num: '1', title: 'CSV Upload', desc: 'Upload employee addresses, amounts, memos' },
                { num: '2', title: 'Encrypt & Store', desc: 'FHE16 encrypt → Store off-chain' },
                { num: '3', title: 'Create Batch', desc: 'Create payment batch (Draft status)' },
                { num: '4', title: 'Approve & Execute', desc: 'After approval, batch transfer USDT' },
              ].map((step, idx) => (
                <div key={idx} className="bg-[var(--dark)] border border-white/10 rounded-xl md:rounded-2xl p-5 md:p-8 text-center">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-lg md:text-xl font-bold mx-auto mb-4 md:mb-6">
                    {step.num}
                  </div>
                  <h3 className="font-semibold mb-2 md:mb-3 text-sm md:text-base">{step.title}</h3>
                  <p className="text-xs md:text-sm text-[var(--gray)]">{step.desc}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { num: '1', title: 'Connect Wallet', desc: 'Authenticate with your wallet' },
                { num: '2', title: 'View History', desc: 'View encrypted salary history' },
                { num: '3', title: 'Decrypt Payslip', desc: 'Decrypt payslip with your key' },
                { num: '4', title: 'Download PDF', desc: 'Download signed payslip' },
              ].map((step, idx) => (
                <div key={idx} className="bg-[var(--dark)] border border-white/10 rounded-xl md:rounded-2xl p-5 md:p-8 text-center">
                  <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-r from-[#667eea] to-[#764ba2] rounded-full flex items-center justify-center text-lg md:text-xl font-bold mx-auto mb-4 md:mb-6">
                    {step.num}
                  </div>
                  <h3 className="font-semibold mb-2 md:mb-3 text-sm md:text-base">{step.title}</h3>
                  <p className="text-xs md:text-sm text-[var(--gray)]">{step.desc}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Tech Stack */}
      <section className="py-16 md:py-24 px-4 md:px-8">
        <h2 className="text-2xl md:text-4xl font-bold text-center mb-10 md:mb-16 bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
          Technology Stack
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6 max-w-[900px] mx-auto">
          {[
            { icon: '&#x1F510;', name: 'FHE16', desc: '16-bit FHE' },
            { icon: '&#x26D3;&#xFE0F;', name: 'Mantle Sepolia', desc: 'Chain ID: 5003' },
            { icon: '&#x1F4B5;', name: 'USDT', desc: 'MockUSDT (Testnet)' },
            { icon: '&#x1F4E6;', name: 'Solidity', desc: 'Smart Contracts' },
            { icon: '&#x1F310;', name: 'ethers.js', desc: 'Web3 Integration' },
            { icon: '&#x26A1;', name: 'WASM', desc: 'Browser FHE' },
          ].map((tech, idx) => (
            <div key={idx} className="bg-[var(--dark-lighter)] border border-white/10 rounded-xl md:rounded-2xl p-4 md:p-6 text-center hover:border-[var(--primary)] hover:-translate-y-1 transition-all">
              <div className="text-2xl md:text-3xl mb-2 md:mb-3" dangerouslySetInnerHTML={{ __html: tech.icon }} />
              <div className="font-semibold mb-1 text-sm md:text-base">{tech.name}</div>
              <div className="text-xs text-[var(--gray)]">{tech.desc}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 px-4 md:px-8 text-center">
        <div className="max-w-[600px] mx-auto">
          <h2 className="text-2xl md:text-4xl font-bold mb-4">Ready to Try?</h2>
          <p className="text-[var(--gray)] mb-8">Experience it yourself on Mantle Sepolia testnet</p>
          <div className="flex justify-center gap-3 md:gap-4 flex-wrap">
            <a
              href="https://faucet.sepolia.mantle.xyz"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 rounded-2xl text-sm md:text-base font-semibold bg-white/10 text-white border-2 border-white/20 hover:bg-white/20 transition-all"
            >
              <span>&#x1F6B0;</span> Get Test MNT
            </a>
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 md:gap-3 px-6 md:px-8 py-3 md:py-4 rounded-2xl text-sm md:text-base font-semibold bg-gradient-to-r from-[#667eea] to-[#764ba2] text-white shadow-lg shadow-indigo-500/30 hover:-translate-y-1 transition-all"
            >
              <span>&#x1F680;</span> Launch App
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 md:py-12 px-4 md:px-8 border-t border-white/10 text-center">
        <div className="max-w-[600px] mx-auto">
          <div className="text-[var(--gray)] mb-4">
            <p><strong>Network:</strong> Mantle Sepolia (Chain ID: 5003)</p>
            <p><strong>Token:</strong> MockUSDT (6 decimals)</p>
          </div>
          <div className="flex justify-center gap-4 mb-6 text-sm">
            <a href="https://faucet.sepolia.mantle.xyz" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">Mantle Faucet</a>
            <span className="text-[var(--gray)]">|</span>
            <a href="https://sepolia.mantlescan.xyz" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">Block Explorer</a>
            <span className="text-[var(--gray)]">|</span>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-[var(--primary)] hover:underline">GitHub</a>
          </div>
          <p className="text-sm text-[var(--gray)] opacity-70">© 2025 LatticA Salary. Built for Mantle Hackathon.</p>
        </div>
      </footer>
    </div>
  );
}
