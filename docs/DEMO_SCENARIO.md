# LatticA Salary - Demo Scenario

## 해커톤 시연 시나리오

### 준비물
- MetaMask 지갑 3개 (Admin 1, Employee 2)
- Mantle Sepolia 테스트 MNT ([Faucet](https://faucet.sepolia.mantle.xyz))
- 브라우저 2개 (또는 시크릿 모드)

---

## 시나리오 1: 기본 급여 등록 및 확인

### Step 1: Admin - 직원 등록

```
1. http://localhost:3000/admin 접속
2. MetaMask에서 Admin 계정으로 연결
3. "Employees" 탭 클릭
4. 직원 정보 입력:
   - Wallet Address: [Employee 1 주소]
   - Employee ID: EMP-001
   - Name: Alice Kim
   - Department: Engineering
   - Base Salary: 5000
5. "Register (Encrypt & Commit)" 클릭
```

**관찰 포인트:**
- FHE16 암호화 진행 (콘솔에서 확인)
- Commitment 해시 생성
- Employee Registry에 등록됨

### Step 2: Employee - 급여 확인

```
1. http://localhost:3000/employee 접속
2. MetaMask에서 Employee 1 계정으로 연결
3. "Decrypt Payslip" 섹션 확인
4. (향후) 암호화된 급여 복호화
```

**관찰 포인트:**
- 자신의 지갑으로만 복호화 가능
- 다른 사람은 급여 내용을 볼 수 없음

---

## 시나리오 2: 기밀 급여 지급 (FHE + ZK)

### 전통적인 방식의 문제점

```
❌ 전통 방식:
   Admin 지갑 → 5,000 USDT → Employee 지갑

   블록체인 탐색기에서 누구나 볼 수 있음:
   "0xAdmin가 0xEmployee에게 5,000 USDT 전송"
```

### LatticA 방식

```
✅ LatticA 방식:

Step 1: Admin이 Pool에 총액 입금
   Admin 지갑 → 50,000 USDT → ConfidentialPool

   탐색기: "0xAdmin가 Pool에 50,000 USDT 입금"
   (개별 급여는 모름!)

Step 2: Admin이 암호화된 급여 commitment 등록
   commitment = Poseidon(FHE16.encrypt(5000), secret, nonce)

   탐색기: "commitment 0x3a5f... 등록됨"
   (5000이라는 숫자 없음!)

Step 3: Employee가 ZK Proof로 인출
   Employee: "나는 이 commitment의 주인이고, X USDT를 받을 자격이 있어"

   탐색기: "0xEmployee가 Pool에서 인출, nullifier: 0x7b2c..."
   (금액 X는 보이지 않음!)
```

---

## 시나리오 3: 프라이버시 비교 시연

### 준비
1. Admin 계정으로 Employee 2명 등록
   - EMP-001: Alice, 5000 USDT
   - EMP-002: Bob, 8000 USDT

### 전통 방식 (투명한 전송)
```
tx1: Admin → Alice: 5,000 USDT ← 공개!
tx2: Admin → Bob: 8,000 USDT   ← 공개!

결과:
- Alice는 Bob이 자기보다 많이 받는다는 걸 알 수 있음
- 외부인도 모든 급여를 볼 수 있음
```

### LatticA 방식 (기밀 전송)
```
tx1: Admin → Pool: 13,000 USDT (총액만 공개)
tx2: commitment_alice 등록 (금액 없음)
tx3: commitment_bob 등록 (금액 없음)
tx4: Alice → Pool.withdraw(proof) ← 금액 비공개!
tx5: Bob → Pool.withdraw(proof)   ← 금액 비공개!

결과:
- Alice는 자기 급여(5000)만 알고, Bob 급여는 모름
- Bob도 자기 급여(8000)만 알고, Alice 급여는 모름
- 외부인은 총액(13000)만 알고, 개별 급여는 모름
```

---

## 시나리오 4: 기술 데모 (개발자용)

### FHE16 암호화 시연

```javascript
// 브라우저 콘솔에서 실행
await fhe16.init();
await fhe16.loadPublicKey();

// 급여 암호화
const encrypted = await fhe16.encrypt(5000);
console.log('Encrypted:', encrypted.slice(0, 50) + '...');

// 암호화된 상태에서 연산 가능 (동형암호)
// const encryptedWithBonus = await fhe16.add(encrypted, bonusEncrypted);
```

### ZK Proof 생성 시연

```javascript
// 브라우저 콘솔에서 실행
import { confidentialSalary } from '@/lib/confidential';

// 급여 등록 (Admin)
const encrypted = await confidentialSalary.registerSalary(
  'EMP-001',
  '0xAliceAddress',
  5000,
  'January 2025'
);
console.log('Commitment:', encrypted.commitment);

// Merkle Root 확인
const root = await confidentialSalary.getMerkleRoot();
console.log('Merkle Root:', root);

// ZK Proof 생성 (Employee)
const proof = await confidentialSalary.generateWithdrawProof('0xAliceAddress');
console.log('Proof:', proof);
```

### 스마트 컨트랙트 호출 시연

```javascript
// Pool에 입금 (Admin)
await pool.deposit(50000 * 1e6); // 50,000 USDT

// Commitment 등록 (Admin)
await pool.registerCommitment(commitmentHash);

// Merkle Root 업데이트 (Admin)
await pool.updateMerkleRoot(newRoot);

// ZK Proof로 인출 (Employee)
await pool.withdraw(proof, publicSignals, recipientAddress);
```

---

## 화면별 데모 포인트

### Landing Page (`/`)
- **핵심 메시지**: "급여 금액까지 숨기는 진정한 프라이버시"
- **보여줄 것**: 아키텍처 다이어그램, 기술 스택

### Admin Portal (`/admin`)
- **핵심 메시지**: "암호화된 급여 관리"
- **보여줄 것**:
  - CSV 업로드 → FHE16 암호화
  - Employee 등록 → Commitment 생성
  - Treasury Balance (Pool 잔액)

### Employee Portal (`/employee`)
- **핵심 메시지**: "나만 볼 수 있는 내 급여"
- **보여줄 것**:
  - 암호화된 Payslip 목록
  - FHE16 복호화 → 급여 확인
  - ZK Proof 생성 → 기밀 인출

---

## Q&A 예상 질문

### Q: "왜 FHE랑 ZK 둘 다 써요?"

**A**: 역할이 다릅니다.
- **FHE16**: 급여 **데이터** 암호화 (payslip 내용, 세금 계산)
- **ZK**: 급여 **인출** 증명 (금액 공개 없이 자격 증명)

### Q: "진짜 금액이 안 보여요?"

**A**: 네!
- 온체인에는 `commitment`만 저장됨 (해시값)
- 인출 시에도 `nullifier`와 `proof`만 제출
- 금액은 ZK circuit 내부에서만 검증

### Q: "이중 인출 방지는?"

**A**: Nullifier 시스템
- `nullifier = Poseidon(secret, nonce)`
- 한 번 사용된 nullifier는 다시 사용 불가
- 각 급여당 하나의 nullifier

### Q: "상용화 가능해요?"

**A**: 가능합니다!
- snarkjs → arkworks (MIT) 교체하면 라이선스 OK
- FHE16은 자체 기술
- Threshold FHE로 키 분산 가능

---

## 데모 스크립트 (3분 버전)

```
[0:00-0:30] 문제 제기
"현재 블록체인 급여 시스템의 문제점은 모든 급여가 공개된다는 것입니다.
Alice가 5000 USDT, Bob이 8000 USDT 받으면 모두가 알 수 있죠."

[0:30-1:00] 솔루션 소개
"LatticA는 FHE와 ZK를 결합해서 이 문제를 해결합니다.
급여 데이터는 FHE로 암호화하고, 인출은 ZK Proof로 검증합니다."

[1:00-2:00] 데모
"Admin이 Pool에 총액만 입금하고, 각 직원의 commitment를 등록합니다.
직원은 자신의 암호화된 급여를 복호화해서 확인하고,
ZK Proof를 생성해서 금액 공개 없이 인출합니다."

[2:00-2:30] 결과 확인
"블록체인 탐색기를 보면, Pool 입금과 인출만 보이고
개별 급여 금액은 어디에도 기록되지 않습니다."

[2:30-3:00] 마무리
"LatticA는 Mantle L2에서 저렴한 비용으로
진정한 급여 프라이버시를 제공합니다."
```

---

## 체크리스트

### 시연 전
- [ ] MetaMask 3개 계정 준비
- [ ] Mantle Sepolia MNT 충전
- [ ] `npm run dev` 실행
- [ ] 브라우저 콘솔 열어두기

### 시연 중
- [ ] Admin 지갑 연결 확인
- [ ] Employee 등록 성공 확인
- [ ] Commitment 생성 로그 확인
- [ ] Employee 지갑 전환
- [ ] 복호화/Proof 생성 확인

### 시연 후
- [ ] 질문 대비
- [ ] 코드 설명 준비
- [ ] 향후 계획 설명

---

Built for Mantle Hackathon 2025 by waLLLnut
