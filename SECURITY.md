# Security Analysis & Recommendations

## Overview

This document outlines security considerations, known issues, and recommended practices for the LatticA Salary system.

## ✅ Security Fixes Implemented

### 1. Network Security
- ✅ **HTTP → HTTPS Support**: Executor now supports HTTPS with environment variable configuration
- ✅ **Environment Variable Configuration**: Removed hardcoded `localhost` URLs
- ✅ **Protocol Detection**: Automatic HTTP/HTTPS selection based on GATEHOUSE_URL
- ✅ **Production Warning**: Warning message when using HTTP in production

**Configuration:**
```bash
# .env
GATEHOUSE_URL=https://your-gatehouse-domain.com
NODE_ENV=production
```

### 2. DoS Protection
- ✅ **Ciphertext Size Limit**: Maximum 200KB per ciphertext (FHE16 standard ~133KB)
- ✅ **Input Validation**: CID and data validation in smart contracts

**Changes:**
- `CERC20.sol`: Added `require(encryptedData.length <= 200000)` check

### 3. Request Identification
- ✅ **Executor ID Headers**: All API requests include `X-Executor-ID` header
- ✅ **Traceability**: Improved request tracking and debugging

## 🔴 Critical Issues (Require Immediate Action)

### 1. FHE Secret Key Storage

**Issue:** Secret key stored as plaintext binary file
**Risk:** Key compromise = full system breach
**Location:** `executor/FHE16/store/keys/`

**Recommended Solutions:**

#### Option A: Hardware Security Module (HSM)
```javascript
const { KMS } = require('@aws-sdk/client-kms');

async function loadSecretKey() {
  const { Plaintext } = await kms.decrypt({
    CiphertextBlob: encryptedKeyData,
    KeyId: process.env.KMS_KEY_ID
  });
  return FHE16.secretKeyFromBytes(Plaintext);
}
```

#### Option B: HashiCorp Vault
```bash
# Store key
vault kv put secret/fhe-executor secret_key=@secret.bin

# Retrieve key
vault kv get -field=secret_key secret/fhe-executor
```

#### Option C: Kubernetes Secret (for K8s deployments)
```yaml
apiVersion: v1
kind: Secret
metadata:
  name: fhe-secret-key
type: Opaque
data:
  secret.bin: <base64-encoded-key>
```

### 2. Private Key Management

**Issue:** Private key in `.env` file
**Risk:** Exposure through logs, process list, or accidental commits
**Location:** `.env` file

**Recommended Solutions:**

#### Option A: Hardware Wallet (Ledger/Trezor)
```javascript
// hardhat.config.js
import { LedgerSigner } from '@anders-t/ethers-ledger';

networks: {
  mantleSepolia: {
    url: process.env.RPC_URL,
    accounts: async () => {
      const ledger = new LedgerSigner(ethers.provider);
      return [await ledger.getAddress()];
    }
  }
}
```

#### Option B: Encrypted Keystore
```javascript
import { Wallet } from 'ethers';

const keystore = fs.readFileSync('./keystore/deployer.json');
const wallet = await Wallet.fromEncryptedJson(
  keystore,
  process.env.KEYSTORE_PASSWORD
);
```

### 3. API Authentication

**Issue:** No authentication on executor APIs
**Risk:** Unauthorized job submission/results
**Location:** `executor/server.js`

**Recommended Implementation:**

#### JWT-based Authentication
```javascript
const jwt = require('jsonwebtoken');

// Generate token
const token = jwt.sign(
  { executor_id: EXECUTOR_ID },
  process.env.EXECUTOR_SECRET,
  { expiresIn: '1h' }
);

// Add to requests
headers: {
  'Authorization': `Bearer ${token}`,
  'X-Executor-ID': EXECUTOR_ID
}
```

#### mTLS (Mutual TLS)
```javascript
const https = require('https');

const httpsAgent = new https.Agent({
  cert: fs.readFileSync('./certs/client-cert.pem'),
  key: fs.readFileSync('./certs/client-key.pem'),
  ca: fs.readFileSync('./certs/ca-cert.pem'),
  rejectUnauthorized: true
});
```

## 🟠 High Priority Issues

### 1. Multi-Executor Authorization

**Issue:** Single executor address has full control
**Risk:** Single point of failure
**Recommendation:** Implement multi-signature executor system

```solidity
mapping(address => bool) public authorizedExecutors;
uint256 public requiredConfirmations = 2;

mapping(bytes32 => mapping(address => bool)) public confirmations;

function updateBalance(address account, bytes32 newCid) external {
    require(authorizedExecutors[msg.sender], "Not authorized");

    bytes32 updateHash = keccak256(abi.encodePacked(account, newCid));
    confirmations[updateHash][msg.sender] = true;

    if (countConfirmations(updateHash) >= requiredConfirmations) {
        // Execute update
    }
}
```

### 2. Rate Limiting

**Issue:** No rate limiting on executor polling
**Risk:** DoS attack on Gatehouse API
**Recommendation:** Implement exponential backoff

```javascript
let pollInterval = 5000;
let consecutiveErrors = 0;

async function pollWithBackoff() {
  try {
    await pollForJobs();
    consecutiveErrors = 0;
    pollInterval = Math.max(1000, pollInterval - 1000);
  } catch (error) {
    consecutiveErrors++;
    pollInterval = Math.min(60000, pollInterval * 2);
  }
  setTimeout(pollWithBackoff, pollInterval);
}
```

### 3. Input Validation (Frontend)

**Issue:** Insufficient client-side validation
**Risk:** Malicious input reaching contracts
**Recommendation:** Use Zod for schema validation

```typescript
import { z } from 'zod';
import { isAddress } from 'viem';

const PaymentSchema = z.object({
  employee: z.string().refine(isAddress),
  amountCid: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  memo: z.string().max(256).regex(/^[A-Za-z0-9 .,!?-]*$/)
});
```

## 🟡 Medium Priority Issues

### 1. Reentrancy Protection

**Status:** Partially mitigated with `nonReentrant` modifier
**Enhancement:** Implement 2-phase transfers

```solidity
function initiateTransfer(address to, bytes32 amountCid)
    external returns (bytes32 requestId) {
    // Phase 1: Create pending request
}

function finalizeTransfer(bytes32 requestId)
    external onlyExecutor {
    // Phase 2: Complete transfer after FHE computation
}
```

### 2. CSRF Protection

**Recommendation:** Add nonce to all state-changing operations

```typescript
const nonce = generateNonce();
const message = JSON.stringify({ ...data, nonce, timestamp: Date.now() });
const signature = await walletClient.signMessage({ message });
```

### 3. XSS Protection

**Recommendation:** Sanitize all user inputs

```typescript
import DOMPurify from 'isomorphic-dompurify';

function sanitizeInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: []
  });
}
```

## Security Checklist

### Before Testnet Deployment
- [ ] Change GATEHOUSE_URL to HTTPS
- [ ] Set NODE_ENV=production
- [ ] Configure firewall rules
- [ ] Enable API rate limiting
- [ ] Review all TODO comments in code
- [ ] Test with limited testnet tokens first

### Before Mainnet Deployment
- [ ] **Security Audit** by professional firm
- [ ] Migrate secret key to HSM/KMS
- [ ] Implement multi-sig executor
- [ ] Set up monitoring and alerting
- [ ] Prepare incident response plan
- [ ] Insurance coverage (if applicable)
- [ ] Bug bounty program

## Monitoring & Alerts

### Recommended Monitoring

```javascript
// Log suspicious activities
logger.warn('Security:Alert', 'Large ciphertext detected', {
  size: encryptedData.length,
  sender: msg.sender,
  cid: cid
});

// Track executor health
logger.info('Executor:Health', 'Heartbeat', {
  uptime: process.uptime(),
  memoryUsage: process.memoryUsage(),
  jobsProcessed: totalJobs
});
```

### Alert Conditions
- Multiple failed authentication attempts
- Ciphertext size > 150KB
- Executor offline > 5 minutes
- Unusual number of registrations from single address
- Gas price spikes
- Smart contract balance changes

## Incident Response

### If Key Compromise Suspected
1. **Immediate:** Stop all executors
2. **Assess:** Determine scope of compromise
3. **Rotate:** Generate new keys
4. **Update:** Deploy new contracts if needed
5. **Notify:** Inform all stakeholders
6. **Review:** Conduct post-mortem

### If Contract Exploit Found
1. **Pause:** If pausable, activate pause mechanism
2. **Analyze:** Understand the attack vector
3. **Patch:** Deploy fixed version
4. **Migrate:** Move funds/state to new contract
5. **Disclose:** Responsible disclosure to community

## Best Practices

### Development
- ✅ Keep dependencies updated
- ✅ Use `npm audit` regularly
- ✅ Enable compiler warnings
- ✅ Write comprehensive tests
- ✅ Code review all changes
- ✅ Use static analysis tools (Slither, Mythril)

### Operations
- ✅ Separate dev/staging/prod environments
- ✅ Use different keys for each environment
- ✅ Regular backups of critical data
- ✅ Maintain runbooks for common issues
- ✅ Regular security training for team

### Compliance
- ✅ GDPR compliance for EU users
- ✅ Data retention policies
- ✅ Audit logging
- ✅ Access control reviews
- ✅ Regular penetration testing

## Resources

### Security Tools
- **Slither**: Solidity static analyzer
- **Mythril**: Smart contract security analysis
- **Echidna**: Fuzzing tool
- **Manticore**: Symbolic execution
- **npm audit**: Dependency vulnerability scanner

### References
- [Smart Contract Security Best Practices](https://consensys.github.io/smart-contract-best-practices/)
- [OpenZeppelin Security](https://docs.openzeppelin.com/contracts/security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [NIST Cybersecurity Framework](https://www.nist.gov/cyberframework)

## Contact

For security issues, please contact:
- Email: security@your-domain.com
- PGP Key: [Your PGP Key]
- Bug Bounty: [Platform URL]

**Do NOT disclose security vulnerabilities publicly until they are fixed.**

---

Last Updated: 2026-01-02
Version: 1.0.0
