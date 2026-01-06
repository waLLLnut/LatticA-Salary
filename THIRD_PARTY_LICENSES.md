# Third Party Licenses

This document lists all third-party software used in the LatticA-Salary project and their respective licenses.

---

## zkBob Contracts

**Source:** https://github.com/zkBob/zkbob-contracts

**Files:** `contracts/zkbob/`, `contracts/interfaces/`, `contracts/libraries/`, `contracts/utils/`, `contracts/proxy/`

**Licenses:**

### CC0-1.0 (Public Domain)

The majority of zkBob smart contracts are released under the CC0-1.0 License (Public Domain Dedication).

```
CC0 1.0 Universal

CREATIVE COMMONS CORPORATION IS NOT A LAW FIRM AND DOES NOT PROVIDE
LEGAL SERVICES. DISTRIBUTION OF THIS DOCUMENT DOES NOT CREATE AN
ATTORNEY-CLIENT RELATIONSHIP. CREATIVE COMMONS PROVIDES THIS
INFORMATION ON AN "AS-IS" BASIS. CREATIVE COMMONS MAKES NO WARRANTIES
REGARDING THE USE OF THIS DOCUMENT OR THE INFORMATION OR WORKS
PROVIDED HEREUNDER, AND DISCLAIMS LIABILITY FOR DAMAGES RESULTING FROM
THE USE OF THIS DOCUMENT OR THE INFORMATION OR WORKS PROVIDED
HEREUNDER.

Statement of Purpose

The laws of most jurisdictions throughout the world automatically confer
exclusive Copyright and Related Rights (defined below) upon the creator
and subsequent owner(s) (each and all, an "owner") of an original work of
authorship and/or a database (each, a "Work").

Certain owners wish to permanently relinquish those rights to a Work for
the purpose of contributing to a commons of creative, cultural and
scientific works ("Commons") that the public can reliably and without fear
of later claims of infringement build upon, modify, incorporate in other
works, reuse and redistribute as freely as possible in any form whatsoever
and for any purposes, including without limitation commercial purposes.
```

Full license text: [contracts/zkbob/LICENSE-CC0](contracts/zkbob/LICENSE-CC0)

### MIT License (ZeroPool Adapted Code)

Some smart contracts that were adapted from their original versions developed by the ZeroPool team are released under the MIT License.

```
MIT License

Copyright (c) 2021 ZeroPool

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Full license text: [contracts/zkbob/LICENSE-MIT](contracts/zkbob/LICENSE-MIT)

---

## OpenZeppelin Contracts

**Source:** https://github.com/OpenZeppelin/openzeppelin-contracts

**License:** MIT

**Usage:** Used as dependency by zkBob contracts for standard ERC20, SafeERC20, Address utilities.

```
MIT License

Copyright (c) 2016-2023 OpenZeppelin

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## Summary

| Component | License | Commercial Use | Attribution Required |
|-----------|---------|----------------|---------------------|
| LatticA Core (FHE16) | BSL 1.1 | See LICENSE | Yes |
| zkBob Contracts | CC0-1.0 / MIT | Yes | No (CC0) / Yes (MIT) |
| OpenZeppelin | MIT | Yes | Yes |

---

## Attribution

This project incorporates code from the following open source projects:

1. **zkBob** - Privacy-focused stablecoin protocol
   - Repository: https://github.com/zkBob/zkbob-contracts
   - License: CC0-1.0 / MIT
   - Copyright: zkBob Team, ZeroPool (for MIT portions)

2. **OpenZeppelin Contracts** - Secure smart contract library
   - Repository: https://github.com/OpenZeppelin/openzeppelin-contracts
   - License: MIT
   - Copyright: OpenZeppelin

---

*Last updated: January 2025*
