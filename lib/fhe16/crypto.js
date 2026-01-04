const crypto = require('crypto');

/**
 * FHE16 Crypto Utilities
 * Helper functions for ciphertext handling and CID generation
 */

/**
 * Generate a Content Identifier (CID) for a ciphertext
 * @param {Object} ciphertext - Ciphertext object with encrypted_data
 * @returns {string} - 32-byte hex CID
 */
function generateCID(ciphertext) {
  if (!ciphertext || !ciphertext.encrypted_data) {
    throw new Error('Invalid ciphertext object');
  }

  // Convert encrypted_data array to buffer
  const dataBuffer = Buffer.from(
    Int32Array.from(ciphertext.encrypted_data).buffer
  );

  // Hash with SHA256
  const hash = crypto.createHash('sha256').update(dataBuffer).digest();

  return '0x' + hash.toString('hex');
}

/**
 * Validate ciphertext structure
 * @param {Object} ct - Ciphertext to validate
 * @returns {boolean}
 */
function validateCiphertext(ct) {
  if (!ct || typeof ct !== 'object') return false;
  if (!ct.encrypted_data || !Array.isArray(ct.encrypted_data)) return false;
  if (ct.encrypted_data.length !== 33296) return false;  // FHE16 size
  if (!ct.scheme || ct.scheme !== 'FHE16_0.0.1v') return false;
  if (!ct.timestamp || typeof ct.timestamp !== 'number') return false;

  return true;
}

/**
 * Serialize ciphertext to bytes
 * @param {Object} ct - Ciphertext object
 * @returns {Buffer}
 */
function serializeCiphertext(ct) {
  if (!validateCiphertext(ct)) {
    throw new Error('Invalid ciphertext');
  }

  const dataArray = Int32Array.from(ct.encrypted_data);
  return Buffer.from(dataArray.buffer);
}

/**
 * Deserialize bytes to ciphertext
 * @param {Buffer} buffer - Serialized ciphertext
 * @returns {Object} - Ciphertext object
 */
function deserializeCiphertext(buffer) {
  if (!buffer || buffer.length !== 33296 * 4) {
    throw new Error('Invalid buffer size for FHE16 ciphertext');
  }

  const dataArray = new Int32Array(
    buffer.buffer,
    buffer.byteOffset,
    buffer.byteLength / 4
  );

  return {
    encrypted_data: Array.from(dataArray),
    scheme: 'FHE16_0.0.1v',
    timestamp: Date.now()
  };
}

/**
 * Convert ciphertext to hex string (for Solidity)
 * @param {Object} ct - Ciphertext object
 * @returns {string} - Hex string with 0x prefix
 */
function ciphertextToHex(ct) {
  const buffer = serializeCiphertext(ct);
  return '0x' + buffer.toString('hex');
}

/**
 * Convert hex string to ciphertext
 * @param {string} hex - Hex string (with or without 0x prefix)
 * @returns {Object} - Ciphertext object
 */
function hexToCiphertext(hex) {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const buffer = Buffer.from(cleanHex, 'hex');
  return deserializeCiphertext(buffer);
}

/**
 * Create zero ciphertext (for initialization)
 * @returns {Object} - Zero ciphertext
 */
function createZeroCiphertext() {
  return {
    encrypted_data: new Array(33296).fill(0),
    scheme: 'FHE16_0.0.1v',
    timestamp: Date.now()
  };
}

/**
 * Compare two CIDs
 * @param {string} cid1 - First CID
 * @param {string} cid2 - Second CID
 * @returns {boolean}
 */
function compareCIDs(cid1, cid2) {
  if (!cid1 || !cid2) return false;

  const clean1 = cid1.startsWith('0x') ? cid1.slice(2) : cid1;
  const clean2 = cid2.startsWith('0x') ? cid2.slice(2) : cid2;

  return clean1.toLowerCase() === clean2.toLowerCase();
}

module.exports = {
  generateCID,
  validateCiphertext,
  serializeCiphertext,
  deserializeCiphertext,
  ciphertextToHex,
  hexToCiphertext,
  createZeroCiphertext,
  compareCIDs
};
