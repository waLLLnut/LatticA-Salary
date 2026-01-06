# LatticA Salary - Project Structure

## 디렉토리 구조

```
LatticA-Salary/
│
├── 📁 frontend/                    # Next.js 15 프론트엔드
│   ├── 📁 app/
│   │   ├── page.tsx               # 랜딩 페이지
│   │   ├── admin/page.tsx         # Admin Portal
│   │   ├── employee/page.tsx      # Employee Portal
│   │   └── layout.tsx             # 공통 레이아웃
│   │
│   ├── 📁 lib/
│   │   ├── fhe.ts                 # FHE16 WASM 래퍼
│   │   ├── wallet.ts              # MetaMask & 컨트랙트 연동
│   │   └── confidential.ts        # FHE + ZK 통합 모듈
│   │
│   ├── 📁 hooks/
│   │   ├── useFHE.ts              # FHE React Hook
│   │   ├── useWallet.ts           # Wallet React Hook
│   │   └── useConfidential.ts     # Confidential Salary Hook
│   │
│   └── 📁 public/
│       ├── fhe16.js               # FHE16 WASM 로더
│       ├── fhe16.wasm             # FHE16 WASM 바이너리
│       └── pk.bin                 # FHE16 공개키
│
├── 📁 contracts/                   # Solidity 스마트 컨트랙트
│   ├── SalaryPayroll.sol          # 기본 급여 컨트랙트
│   ├── ConfidentialPool.sol       # ZK 기반 기밀 인출 Pool
│   └── CERC20.sol                 # MockUSDT 토큰
│
├── 📁 circuits/                    # ZK 회로 (circom)
│   └── salary_withdraw.circom     # 급여 인출 증명 회로
│
├── 📁 zk-lib/                      # ZK 유틸리티 라이브러리
│   └── index.ts                   # Merkle Tree, Proof 생성
│
├── 📁 lib/                         # Node.js FHE16 라이브러리
│   └── fhe16/
│       ├── fhe16.d.ts             # TypeScript 타입 정의
│       └── README.md
│
├── 📁 executor/                    # FHE 연산 실행기
│   └── FHE16/
│       ├── index.d.ts
│       └── README.md
│
├── 📁 docs/                        # 문서
│   ├── ARCHITECTURE.md            # 기술 아키텍처
│   ├── DEMO_SCENARIO.md           # 해커톤 시연 가이드
│   └── PROJECT_STRUCTURE.md       # 프로젝트 구조 (이 파일)
│
├── 📁 scripts/                     # 배포 스크립트
│   └── deploy.mjs                 # Hardhat 배포
│
├── README.md                       # 프로젝트 소개
├── LICENSE                         # BSL 1.1 라이선스
├── package.json
├── hardhat.config.js
└── .gitignore
```

## 핵심 파일 설명

### Frontend

| 파일 | 역할 |
|------|------|
| `lib/fhe.ts` | FHE16 WASM 모듈 초기화, 암호화/복호화 |
| `lib/wallet.ts` | MetaMask 연결, Mantle Sepolia 네트워크 설정 |
| `lib/confidential.ts` | FHE + ZK 통합, Merkle Tree 관리 |
| `hooks/useConfidential.ts` | React에서 기밀 급여 기능 사용 |

### Smart Contracts

| 파일 | 역할 |
|------|------|
| `SalaryPayroll.sol` | 기본 급여 지급 (commitment 기반) |
| `ConfidentialPool.sol` | ZK proof 검증 + 기밀 인출 |
| `CERC20.sol` | 테스트용 MockUSDT 토큰 |

### ZK Components

| 파일 | 역할 |
|------|------|
| `circuits/salary_withdraw.circom` | Groth16 ZK 회로 정의 |
| `zk-lib/index.ts` | Merkle Tree, Poseidon Hash, Proof 생성 |

## 데이터 흐름

### 1. 급여 등록 (Admin)

```
CSV 데이터
    ↓
fhe.ts: FHE16.encrypt(salary)
    ↓
confidential.ts: generateCommitment()
    ↓
ConfidentialPool.sol: registerCommitment()
```

### 2. 급여 인출 (Employee)

```
confidential.ts: getEmployeeSecret()
    ↓
fhe.ts: FHE16.decrypt(encryptedSalary)
    ↓
confidential.ts: generateWithdrawProof()
    ↓
ConfidentialPool.sol: withdraw(proof)
```

## 환경 설정

### Frontend (.env.local)

```env
NEXT_PUBLIC_MOCK_USDT_ADDRESS=0x...
NEXT_PUBLIC_POOL_ADDRESS=0x...
```

### Hardhat (.env)

```env
PRIVATE_KEY=0x...
MANTLE_SEPOLIA_RPC=https://rpc.sepolia.mantle.xyz
```

## 빌드 & 실행

```bash
# 프론트엔드
cd frontend
npm install
npm run dev

# 컨트랙트 배포
npx hardhat run scripts/deploy.mjs --network mantleSepolia

# ZK Circuit 컴파일 (향후)
cd circuits
circom salary_withdraw.circom --r1cs --wasm --sym
```

---

Built for Mantle Hackathon 2025 by waLLLnut
