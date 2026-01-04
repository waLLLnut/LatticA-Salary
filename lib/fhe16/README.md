# FHE16 Integration Library

This library provides utilities for working with FHE16 (Fully Homomorphic Encryption) in the LatticA Salary system.

## Overview

FHE16 allows computation on encrypted data without decryption. This library handles:

- Ciphertext serialization/deserialization
- Content Identifier (CID) generation
- Integration with Ethereum smart contracts
- Client-side encryption (WASM)
- Server-side computation (Node.js)

## Installation

The FHE16 native library is required for server-side operations:

```bash
# Copy from LatticA main project
cp -r ../LatticA/fhe_executor/FHE16/lib ./
cp -r ../LatticA/fhe_executor/FHE16/bootparam.bin ./
cp -r ../LatticA/fhe_executor/FHE16/index.js ./fhe16.js
```

For client-side (WASM):

```bash
# Copy WASM files to frontend public directory
cp ../LatticA/FHE16_WEB_ENC/fhe16.js ../frontend/public/
cp ../LatticA/FHE16_WEB_ENC/fhe16.wasm ../frontend/public/
cp ../LatticA/FHE16_WEB_ENC/pk.bin ../frontend/public/
```

## Usage

### Server-Side (Node.js)

```javascript
const FHE16 = require('./fhe16');
const { generateCID, serializeCiphertext } = require('./crypto');

// Initialize FHE16
FHE16.FHE16_init();
FHE16.bootparamLoadFileGlobal('./bootparam.bin');

// Generate secret key
const sk = FHE16.secretKeyGen();

// Encrypt salary amount (e.g., $5000)
const salary = 5000;
const ctPtr = FHE16.encInt(salary, 32);

// Serialize to ciphertext object
const ct = {
  encrypted_data: FHE16.lweToBytes(ctPtr),
  scheme: 'FHE16_0.0.1v',
  timestamp: Date.now()
};

// Generate CID
const cid = generateCID(ct);
console.log('Salary CID:', cid);

// FHE operations
const ct1 = FHE16.encInt(1000, 32);  // Bonus
const ct2 = FHE16.add(ctPtr, ct1);    // Total = salary + bonus

// Decrypt
const decrypted = FHE16.decInt(ct2, sk);
console.log('Total:', decrypted);  // 6000

// Cleanup
FHE16.lweFree(ctPtr);
FHE16.lweFree(ct1);
FHE16.lweFree(ct2);
FHE16.secretKeyFree(sk);
```

### Client-Side (WASM)

```javascript
// In browser
const module = await window.createFHE16({
  locateFile: (path) => `/${path}`,
});

// Initialize parameters
module._FHE16_init_params(1024, 1025, 163603459, 163603459, 10.0);

// Load public key
const response = await fetch('/pk.bin');
const pkBytes = new Uint8Array(await response.arrayBuffer());
const ptr = module._malloc(pkBytes.byteLength);
module.HEAP8.set(pkBytes, ptr);
module._FHE16_set_pk(ptr, pkBytes.length / 4);

// Encrypt salary
const salary = 5000;
const ctPtr = module._FHE16_ENC_WASM(salary, 32);
const ctStr = module.UTF8ToString(ctPtr);
module._FHE16_free(ctPtr);

// Parse to array
const ctArray = ctStr.split(',').map(s => parseInt(s.trim()));

const ciphertext = {
  encrypted_data: ctArray,
  scheme: 'FHE16_0.0.1v',
  timestamp: Date.now()
};
```

## Ciphertext Structure

FHE16 ciphertexts have the following structure:

```javascript
{
  encrypted_data: Int32Array[33296],  // 16 + 1040*32 integers
  scheme: "FHE16_0.0.1v",             // Version identifier
  timestamp: 1704067200000             // Creation timestamp
}
```

## CID (Content Identifier)

CIDs are 32-byte SHA256 hashes used to identify ciphertexts on-chain:

```
CID = SHA256(encrypted_data)
```

Example: `0x1234abcd...` (66 characters including 0x prefix)

## Supported Operations

### Arithmetic
- `add(a, b)` - Addition
- `sub(a, b)` - Subtraction
- `smull(a, b)` - Multiplication
- `neg(ct)` - Negation
- `addConst_i32(ct, k)` - Add constant
- `smullConst_i32(ct, k)` - Multiply by constant

### Comparison
- `le(a, b)` - Less than or equal
- `lt(a, b)` - Less than
- `ge(a, b)` - Greater than or equal
- `gt(a, b)` - Greater than
- `eq(a, b)` - Equal
- `neq(a, b)` - Not equal

### Utility
- `max(a, b)` - Maximum
- `min(a, b)` - Minimum
- `select(sel, a, b)` - Conditional select

## Security Considerations

1. **Key Management**: Secret keys must be stored securely
2. **CID Integrity**: Always verify CID matches ciphertext hash
3. **Timestamp Validation**: Check ciphertext freshness
4. **Scheme Version**: Ensure compatibility with FHE16_0.0.1v
5. **Size Validation**: Ciphertexts must be exactly 33296 integers

## Performance

- **Encryption**: ~50ms (client), ~10ms (server)
- **Addition**: ~20ms
- **Multiplication**: ~100ms
- **Comparison**: ~150ms
- **Serialization**: ~5ms

## Error Handling

```javascript
const { validateCiphertext } = require('./crypto');

try {
  if (!validateCiphertext(ct)) {
    throw new Error('Invalid ciphertext structure');
  }

  const cid = generateCID(ct);
  // ... proceed with operation
} catch (error) {
  console.error('FHE operation failed:', error.message);
}
```

## API Reference

See [crypto.js](./crypto.js) for detailed function documentation.

## Examples

See [examples/](./examples/) for complete usage examples.

## License

MIT
